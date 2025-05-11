#ifndef EEPROM_HELPER_H
#define EEPROM_HELPER_H

#include <EEPROM.h>

template <typename T>
void eepromWrite(int address, const T& data) {
  EEPROM.put(address, data);
  EEPROM.commit();
}

template <typename T>
void eepromRead(int address, T& outData) {
  T data;
  EEPROM.get(address, outData);
}

#endif
