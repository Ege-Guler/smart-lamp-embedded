## MQTT Topics and Example Payloads

### 🔹 `lamp/config`
**Direction:** Frontend → ESP  
**Purpose:** Set RGB color and brightness of the lamp.
```json
{
  "r": 120,
  "g": 50,
  "b": 200,
  "a": 100
}
```

---

### 🔹 `lamp/request`
**Direction:** Frontend → ESP  
**Purpose:** Request data or actions from the ESP device.

**Request energy consumption:**
```json
{
  "type": "energy_consumption"
}
```

**Request status report:**
```json
{
  "type": "status"
}
```

**Reset the device (clears EEPROM and restarts):**
```json
{
  "type": "reset"
}
```

---

### 🔹 `lamp/error`
**Direction:** ESP → Broker  
**Purpose:** Notify the system or frontend of runtime errors.

```json
{
  "time": 456789,
  "error": "JSON parse failed, request is invalid"
}
```

---

### 🔹 `lamp/energyConsumption`
**Direction:** ESP → Broker  
**Purpose:** Report energy consumption and current power usage.

```json
{
  "uptime": 1234567,
  "energy_usage_whr_life_time": 0.384,
  "energy_usage_whr_since_start": 0.057,
  "wattage": 0.43
}
```

---

### 🔹 `lamp/status`
**Direction:** ESP → Broker  
**Purpose:** Provide device diagnostics and network info.

```json
{
  "device": "h2-smart-lamp",
  "wifi_connected": "MyWiFi",
  "ip_addr": "192.168.1.132",
  "mac_addr": "A8:63:F2:3C:22:4B",
  "heap_free": 41528,
  "rssi": -54,
  "uptime": 345678
}
```

---

### 🔹 `lamp/lwt` (Last Will & Testament)
**Direction:** ESP (via Broker)  
**Purpose:** Indicates device presence (online/offline status).

**On connect:**
```json
{
  "status": "online"
}
```

**On unexpected disconnect (automatically published by broker):**
```json
{
  "status": "offline"
}
```

