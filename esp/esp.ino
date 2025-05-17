#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <EEPROM.h>
#include <LittleFS.h>
#include <Ticker.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <DNSServer.h>
#include <Adafruit_NeoPixel.h>

#include "EEPROMHelper.h"

#define INF 99999
#define S_TO_MS 1000.0
#define H_TO_S 3600.0

#define SSID_ADDR 0
#define PASSWD_ADDR 32
#define MAX_SSID_LEN 32
#define MAX_PASSWD_LEN 64
#define MOD_ADDR 128
#define E_CONSUMPTION_ADDR (MOD_ADDR + sizeof(bool))

#define WIFI_TIMEOUT 16000
#define RESET_BUTTON_PIN 0

const byte DNS_PORT = 53;
#define NEOPIXEL_PIN 5 // GPIO5 (D1 on NodeMCU)
#define RING_LEDS 16
#define R 0
#define G 1
#define B 2
#define A 3

#define PW_SUPPLY_V 5.00

// Acces Point Configuration
const char *ssidAP = "h2-smart-lamp";
const char *passwordAP = "configureme";

IPAddress apIP(172, 217, 28, 1);

bool resetTriggered = false;

// Struct to hold MQTT configuration
struct MQTTConfig
{
  String mqtt_server;
  int mqtt_port;
  String mqtt_user;
  String mqtt_pass;
};

// Struct to hold WiFi credentials
struct WifiConfig
{
  char ssid[32];
  char password[64];
};

ESP8266WebServer server(80);

Ticker blinker;

WiFiClientSecure espClient;
PubSubClient client(espClient);

DNSServer dnsServer;

static BearSSL::X509List *globalRootCert = nullptr;

struct WifiConfig config;
struct MQTTConfig mqttConfig;

static bool isSTA;

// Energy Consumption

double energyConsumptionSinceStart = 0.0;
double energyConsumptionLifeTime = 0.0;
double lastSavedLifeTimeEnergy = 0.0;
unsigned long lastEnergyCheck = millis();
const unsigned long energyCheckIntervalMs = 30000; // 30 seconds



uint8_t globColor[4] = {0, 0, 0, 0}; // r,g,b,a

Adafruit_NeoPixel strip(RING_LEDS, NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);

// Function prototypes
bool loadRootCAFromFS();
void callback(char *topic, byte *payload, unsigned int length);
void setupMQTT();
void handleFileRequest(String path);
void handleFormSubmit();
void setMode(String mode);
void saveCredentials();
void loadCredentials();
String getContentType(String path);
void startAP();
void connectionLoop();
void clearEEPROM();
void blink();
void reconnect();
void readMQTTConfig();
bool syncNTP();
void loadLifeTimeEnergyConsumption();
void saveLifeTimeEnergyConsumption();
double calculatePowerDraw();
void updateEnergyUsage(bool isIntervalBased);
void publishEnergyUsage();
void publishStatus();


void readMQTTConfig()
{
  File file = LittleFS.open("/mqtt.json", "r");
  if (!file)
  {
    Serial.println("Failed to open mqtt.json");
    return;
  }

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, file);
  file.close();

  if (error)
  {
    Serial.println("Failed to parse config file");
    return;
  }
  mqttConfig.mqtt_server = doc["mqtt_server"].as<String>();
  mqttConfig.mqtt_port = doc["mqtt_port"];
  mqttConfig.mqtt_user = doc["mqtt_user"].as<String>();
  mqttConfig.mqtt_pass = doc["mqtt_password"].as<String>();

  Serial.println("MQTT Config loaded successfully.");
}

bool loadRootCAFromFS()
{
  if (globalRootCert != nullptr)
  { // Check if already loaded
    // If espClient could have been reinitialized, re-apply trust anchors.
    // For a single global espClient, this might not be strictly necessary after first load.
    espClient.setTrustAnchors(globalRootCert);
    Serial.println("CA certificate was already loaded. Re-applied to espClient.");
    return true;
  }

  if (!LittleFS.begin())
  { // Ensure LittleFS is mounted if not already
    Serial.println("LittleFS mount failed in loadRootCAFromFS. Make sure it's mounted in setup().");
    // return false; // Or rely on setup() to have mounted it.
  }

  File file = LittleFS.open("/ca.pem", "r");
  if (!file)
  {
    Serial.println("Failed to open /ca.pem from LittleFS.");
    return false;
  }

  String caCertString = file.readString();
  file.close();

  if (caCertString.length() == 0)
  {
    Serial.println("Error: /ca.pem is empty or could not be read.");
    return false;
  }

  // Attempt to create and parse the certificate
  globalRootCert = new BearSSL::X509List(caCertString.c_str());

  if (globalRootCert == nullptr)
  {
    Serial.println("Failed to allocate memory for X509List.");
    return false;
  }

  // Check if the certificate was successfully parsed and added to the list.
  // If getCount() is 0, it means the constructor (which calls append/addCert internally)
  // failed to parse/add the cert from the provided string.
  if (globalRootCert->getCount() == 0)
  {
    Serial.println("Failed to parse CA certificate from /ca.pem. X509List count is 0. Certificate data might be invalid.");
    delete globalRootCert;    // Clean up the allocated but unusable object
    globalRootCert = nullptr; // Mark as not loaded
    return false;
  }

  espClient.setTrustAnchors(globalRootCert);
  // Note: setTrustAnchors itself is void and doesn't return a status.
  // The real test of the CA cert will be during the TLS handshake.

  Serial.println("CA certificate loaded from FS and set as trust anchor. Certificate count: " + String(globalRootCert->getCount()));
  return true;
}

void callback(char *topic, byte *payload, unsigned int length)
{

  String topicStr = String(topic);
  Serial.printf("Message arrived on topic: %s", topic);
  
  String msg = "";

  for (unsigned int i = 0; i < length; i++){
    msg += (char)payload[i];
  }


  if(topicStr == "lamp/config"){
    handleConfig(msg);
  }
  // else if(topicStr == "lamp/energy"){

  // }

  // else if(topicStr == "lamp/status"){

  // }

  publishStatus();
  publishEnergyUsage();

}


/*
{
  "r": 120,
  "g": 50,
  "b": 200,
  "a": 100
}
*/
void handleConfig(const String& msg){
  StaticJsonDocument<64> config;
  DeserializationError err = deserializeJson(config, msg);
  if (err) {
    Serial.println("JSON parse failed, cannot configure");
    return;
  }

  uint8_t r, g, b, a;

  r = config["r"];
  g = config["g"];
  b = config["b"];
  a = config["a"];

  setColorRgb(r, g, b, a);

}

void setupMQTT()
{
  if (!loadRootCAFromFS())
  {
    Serial.println("TLS setup failed.");
    return;
  }

  readMQTTConfig();

  client.setBufferSize(512);
  client.setServer(mqttConfig.mqtt_server.c_str(), mqttConfig.mqtt_port);
  client.setCallback(callback);
}

void handleFileRequest(String path)
{
  if (path.endsWith("/"))
    path += "index.html";
  if (!LittleFS.exists(path))
  {
    server.send(404, "text/plain", "404 Not Found");
    return;
  }

  String contentType = getContentType(path);

  File file = LittleFS.open(path, "r");
  server.streamFile(file, contentType);
  file.close();
}

void handleFormSubmit()
{

  String ssid = server.arg("ssid");
  String passwd = server.arg("passwd");

  if (ssid.length() > MAX_SSID_LEN || passwd.length() > MAX_PASSWD_LEN)
  {
    server.send(413, "text/plain", "<h2>SSID or password too long.</h2>");
    return;
  }

  Serial.println("Received SSID: " + ssid);
  Serial.println("Received Password: " + passwd);

  strncpy(config.ssid, ssid.c_str(), MAX_SSID_LEN);
  strncpy(config.password, passwd.c_str(), MAX_PASSWD_LEN);

  config.ssid[sizeof(config.ssid) - 1] = '\0';
  config.password[sizeof(config.password) - 1] = '\0';

  saveCredentials();
  setMode("STA");

  // Respond to browser
  server.send(200, "text/html", "<h2>Received! Connecting...</h2>");

  delay(2000);
  ESP.restart();
}

// true STA, false AP
void setMode(String mode)
{
  if (mode == "AP")
  {
    eepromWrite(MOD_ADDR, false);
    isSTA = false;
  }
  else if (mode == "STA")
  {
    eepromWrite(MOD_ADDR, true);
    isSTA = true;
  }
  else
    return;
}

// true STA, false AP
bool loadMode()
{
  bool mode;
  eepromRead(MOD_ADDR, mode);
  return mode;
}

// write wifi credentials to EEPROM
void saveCredentials()
{
  eepromWrite(SSID_ADDR, config.ssid);
  eepromWrite(PASSWD_ADDR, config.password);
  Serial.printf("Save Complete | SSID %s, PASSWD %s", config.ssid, config.password);
}

// read wifi credentials from EEPROM
void loadCredentials()
{
  eepromRead(SSID_ADDR, config.ssid);
  eepromRead(PASSWD_ADDR, config.password);
  Serial.printf("Load Complete | SSID %s, PASSWD %s", config.ssid, config.password);
}

String getContentType(String path)
{
  if (path.endsWith(".html"))
    return "text/html";
  if (path.endsWith(".css"))
    return "text/css";
  if (path.endsWith(".js"))
    return "application/javascript";
  if (path.endsWith(".png"))
    return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg"))
    return "image/jpeg";
  if (path.endsWith(".ico"))
    return "image/x-icon";
  return "text/plain";
}

void startAP()
{
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
  WiFi.softAP(ssidAP, passwordAP);
  dnsServer.start(DNS_PORT, "*", apIP);
  blinker.attach(0.5, blink);

  Serial.println("AP started. IP: " + WiFi.softAPIP().toString());

  server.on("/submit", handleFormSubmit);

  server.onNotFound([]()
                    {
  String path = server.uri();
  if (LittleFS.exists(path)) {
    handleFileRequest(path);
  } else {
    if (LittleFS.exists("/index.html")) {
      handleFileRequest("/index.html");
    } else {
      server.send(200, "text/html", "<html><body><h1>Welcome</h1><p>Captive portal fallback page.</p></body></html>");
    }
  } });

  // server.onNotFound([]()
  //                   { handleFileRequest(server.uri()); });

  server.begin();
  Serial.println("HTTP server started (AP mode only)");
}

bool syncNTP()
{
  configTime(0, 0, "pool.ntp.org", "time.nist.gov"); // UTC, no DST, NTP servers
  Serial.print("Waiting for NTP time sync... ");
  time_t now = time(nullptr);

  // Wait until time is reasonably set (e.g., after 2020, epoch 1577836800)
  while (now < 1577836800)
  {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
  }
  Serial.println(" done.");
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  Serial.print("Current time (UTC): ");
  Serial.print(asctime(&timeinfo));
  return true;
}

void connectionLoop()
{
  WiFi.hostname(ssidAP);
  WiFi.begin(config.ssid, config.password);

  Serial.printf("Connecting to %s", config.ssid);

  unsigned long start = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT)
  {
    delay(500);
    yield(); // prevent WDT reset
    Serial.printf("%.0f%%\n", ((float)(millis() - start) / WIFI_TIMEOUT * 100));
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("\nConnected! IP: " + WiFi.localIP().toString());

    if (!syncNTP())
    {
      Serial.println("NTP sync failed.");
      return;
    }

    setupMQTT();
    blinker.detach();
  }
  else
  {
    Serial.println("\nWiFi failed. Switching to AP mode.");
    setMode("AP");
    startAP();
  }
}

void clearEEPROM()
{
  for (int i = 0; i < EEPROM.length(); i++)
  {
    EEPROM.write(i, 0);
  }
  EEPROM.commit();
}

void blink()
{
  digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
}

void reconnect()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("wifi disconnected");
    connectionLoop();
    return;
  }

  if (!client.connected())
  {
    Serial.println("Trying to connect to MQTT Broker...");
    if (client.connect("ESP8266Client32", mqttConfig.mqtt_user.c_str(), mqttConfig.mqtt_pass.c_str()))
    {
      client.subscribe("lamp/config");
      client.subscribe("lamp/test");
      Serial.println("MQTT connected and subscribed.");
    }
    else
    {
      Serial.print("MQTT failed. State: ");
      Serial.println(client.state());
    }
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    client.loop();
  }
}


/*
  NeoPixel Functions
*/

void saveColor(uint8_t r, uint8_t g, uint8_t b, uint8_t a)
{
  globColor[R] = r;
  globColor[G] = g;
  globColor[B] = b;
  globColor[A] = a;
}

// r,g,b,a
void setColorRgb(uint8_t r, uint8_t g, uint8_t b, uint8_t a)
{
  updateEnergyUsage(false);
  strip.setBrightness(a);
  saveColor(r, g, b, a);  
  for (int i = 0; i < strip.numPixels(); i++)
  {
    strip.setPixelColor(i, strip.Color(r, g, b));
  }
  strip.show();
}

void restoreColors(){
  setColorRgb(globColor[R], globColor[G], globColor[B], globColor[A]);
}

void blinkOnce(int period, bool calledFromblinkN){
  
  for (int i = 0; i < strip.numPixels(); i++)
  {
    strip.setPixelColor(i, strip.Color(globColor[R], globColor[G], globColor[B]));
  }
  strip.show();
  delay(period);
  for (int i = 0; i < strip.numPixels(); i++)
  {
    strip.setPixelColor(i, strip.Color(0, 0, 0));
  }
  strip.show();

  if(!calledFromblinkN) restoreColors;
}

void blinkN(int n, int period){
  for (int i = 0; i < n; i++)
  {
    blinkOnce(period, true);
    delay(period);
  }
  restoreColors();
}

void blinkAPMode(){
  blinkOnce(1000, false);
}


void loadLifeTimeEnergyConsumption(){

  Serial.print("Lifetime energy:");
  Serial.println(energyConsumptionLifeTime);
  eepromRead(E_CONSUMPTION_ADDR, energyConsumptionLifeTime);
}

void saveLifeTimeEnergyConsumption(){
  const int threshold = 0.001;
  if(abs(lastSavedLifeTimeEnergy - energyConsumptionLifeTime) < threshold) return;

  eepromWrite(E_CONSUMPTION_ADDR, energyConsumptionLifeTime);
  lastSavedLifeTimeEnergy = energyConsumptionLifeTime;
}

double calculatePowerDraw() {
  double colorFactor = (globColor[R] + globColor[G] + globColor[B]) / 255.0;
  double brightnessFactor = globColor[A] / 255.0;
  
  double current_mA = RING_LEDS * colorFactor * 20.0 * brightnessFactor + RING_LEDS * 1.0;
  
  double power_mW = current_mA * PW_SUPPLY_V;
  return power_mW / 1000.0; // return power in Watts
}

// if isIntervalBased true, update energy usage by interval length 
void updateEnergyUsage(bool isIntervalBased){


  unsigned long now = millis();
  unsigned long dt = now - lastEnergyCheck;

  if(isIntervalBased && dt < energyCheckIntervalMs) return;


  double w = calculatePowerDraw();
  double whIncrement = w * (dt / S_TO_MS) / H_TO_S;

  energyConsumptionSinceStart += whIncrement;
  energyConsumptionLifeTime += whIncrement;
  saveLifeTimeEnergyConsumption();
  
  lastEnergyCheck = now;

}

void publishEnergyUsage(){
  StaticJsonDocument<128> energy_stat;

  energy_stat["uptime"] = millis();
  energy_stat["energy_usage_whr_life_time"] = energyConsumptionLifeTime;
  energy_stat["energy_usage_whr_since_start"] = energyConsumptionSinceStart;

  char energy_stat_payload[128];
  serializeJson(energy_stat, energy_stat_payload);
  client.publish("energy_consumption", energy_stat_payload);

}


void publishStatus(){
  StaticJsonDocument<256> stat;

  stat["device"] = ssidAP;
  stat["wifi_connected"] = WiFi.SSID().c_str();
  stat["ip_addr"] = WiFi.localIP().toString();
  stat["mac_addr"] = WiFi.macAddress().c_str();
  stat["heap_free"] = ESP.getFreeHeap();
  stat["rssi"] = WiFi.RSSI();
  stat["uptime"] = millis() / 1000;

  char stat_payload[256];
  serializeJson(stat, stat_payload);
  client.publish("status", stat_payload);
}

void setup()
{
  strip.begin();
  strip.clear();
  strip.show(); // Initialize all pixels to 'off'

  Serial.begin(9600);
  EEPROM.begin(512); // 512 bytes reserved
  delay(100);

  Serial.println("Setting up...");
  loadLifeTimeEnergyConsumption();

  pinMode(LED_BUILTIN, OUTPUT);
  blinker.detach();

  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);

  WiFi.mode(WIFI_AP_STA); // station & ap

  // Mount LittleFS
  if (!LittleFS.begin())
  {
    Serial.println("LittleFS mount failed");
    return;
  }

  loadCredentials();

  // if true -> STA, if false -> AP
  isSTA = loadMode();
  if (isSTA)
  {
    connectionLoop();
  }
  else
  {
    startAP();
  }
}

void loop()
{

  dnsServer.processNextRequest();
  server.handleClient();

  updateEnergyUsage(true);

  if (isSTA)
  {
    reconnect();
  }

  if (digitalRead(RESET_BUTTON_PIN) == LOW && !resetTriggered)
  {
    resetTriggered = true; // debounce
    Serial.println("FLASH button pressed — resetting WiFi settings...");
    clearEEPROM();
    setMode("AP");
    delay(500);
    ESP.restart();
  }

  // allow another press later
  if (digitalRead(RESET_BUTTON_PIN) == HIGH)
  {
    resetTriggered = false;
  }
}
