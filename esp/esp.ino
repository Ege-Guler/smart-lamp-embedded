#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <EEPROM.h>
#include <LittleFS.h>
#include <Ticker.h>

#include "EEPROMHelper.h"

#define SSID_ADDR 0
#define PASSWD_ADDR 32
#define MAX_SSID_LEN 32
#define MAX_PASSWD_LEN 64
#define MOD_ADDR 128

#define WIFI_TIMEOUT 16000
#define RESET_BUTTON_PIN 0

const char *ssidAP = "h2-smart-lamp";
const char *passwordAP = "configureme";

bool resetTriggered = false;

ESP8266WebServer server(80);


Ticker blinker;

struct WifiConfig
{
  char ssid[32];
  char password[64];
};

struct WifiConfig config;

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
  }
  else if (mode == "STA")
  {
    eepromWrite(MOD_ADDR, true);
  }
  else
    return;
}

void saveCredentials()
{
  eepromWrite(SSID_ADDR, config.ssid);
  eepromWrite(PASSWD_ADDR, config.password);
  Serial.printf("Save Complete | SSID %s, PASSWD %s", config.ssid, config.password);
}

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
  WiFi.softAP(ssidAP, passwordAP);
  blinker.attach(0.5, blink);

  Serial.println("AP started. IP: " + WiFi.softAPIP().toString());


  server.on("/submit", handleFormSubmit);

  server.onNotFound([]()
  { handleFileRequest(server.uri()); });

  server.begin();
  Serial.println("HTTP server started (AP mode only)");
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
    yield(); //prevent WDT reset
    Serial.printf("%.0f%%\n", ((float)(millis() - start) / WIFI_TIMEOUT * 100));
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("\nConnected! IP: " + WiFi.localIP().toString());
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

void setup()
{
  Serial.begin(115200);
  EEPROM.begin(512); // 512 bytes reserved
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

  // false ap, true sta
  bool mode;
  eepromRead(MOD_ADDR, mode);
  Serial.println(mode);
  if (mode)
  {
    connectionLoop();
  }
  else
  {
    startAP();
  }
}

void blink()
{
  digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
}

void loop()
{

  server.handleClient();

  if (digitalRead(RESET_BUTTON_PIN) == LOW && !resetTriggered)
  {
    resetTriggered = true; // debounce
    Serial.println("FLASH button pressed — resetting WiFi settings...");
    clearEEPROM();
    setMode("AP");
    delay(500); // optional: short delay before reset
    ESP.restart();
  }

  // optional: reset flag if released (to allow another press later)
  if (digitalRead(RESET_BUTTON_PIN) == HIGH)
  {
    resetTriggered = false;
  }

}
