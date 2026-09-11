// Counter and state variables
int totalEntries = 0;
bool humanInZone = false; 

// Ghost-filtering variables
bool pendingValidation = false;
unsigned long firstDetectedTime = 0;
const int validationDelayMs = 1500; // Requires 1.5 seconds of continuous presence

void setup() {
  // Start USB Serial Monitor
  Serial.begin(115200);
  
  // Wait for the USB serial to connect (required for Pro Micro)
  while (!Serial) {
    delay(10);
  }
  
  // Start Hardware Serial1 (Pins 0 and 1 on the Pro Micro)
  Serial1.begin(115200);
  
  Serial.println("Pro Micro Max-Range Presence Counter Started!");
  Serial.println("Waiting for human movement...");
}

void loop() {
  // Read from Serial1 instead of RadarSerial
  if (Serial1.available()) {
    String line = Serial1.readStringUntil('\n');
    line.trim(); 
    if (line.length() == 0) return;

    if (line == "ON") {
      // If the zone was empty, start the verification timer
      if (!humanInZone && !pendingValidation) {
        pendingValidation = true;
        firstDetectedTime = millis();
        Serial.println("Potential movement detected... verifying human signature.");
      }
    } 
    else if (line == "OFF") {
      // If it goes OFF before the timer finishes, it was a false alarm
      if (pendingValidation) {
        pendingValidation = false;
        Serial.println("Ghost trigger ignored.");
      }
      
      // If a validated human leaves the zone
      if (humanInZone) {
        humanInZone = false;
        Serial.println("Zone Clear - Subject departed.");
      }
    } 
    else if (line.startsWith("Range") || isDigit(line.charAt(0))) {
      // Parse the distance string
      String distanceStr = line.startsWith("Range") ? line.substring(5) : line;
      distanceStr.trim();
      
      if (humanInZone) {
        Serial.print("Tracking human at: ");
        Serial.print(distanceStr);
        Serial.println(" cm");
      }
    }
  }

  // --- Time-Delay Validation Check ---
  // If we are currently verifying a trigger and 1.5 seconds have passed without an "OFF" signal
  if (pendingValidation && (millis() - firstDetectedTime >= validationDelayMs)) {
    pendingValidation = false;
    humanInZone = true;
    totalEntries++;
    
    Serial.println("============================");
    Serial.print("Human Verified! Total Entries: ");
    Serial.println(totalEntries);
    Serial.println("============================");
  }
}
