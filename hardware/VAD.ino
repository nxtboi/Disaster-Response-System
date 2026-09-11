#include <driver/i2s.h>
#include "USB.h"

// I2S Bus 0 Pins (Mics 1 and 2)
#define I2S0_WS 5
#define I2S0_SD 6
#define I2S0_SCK 4

// I2S Bus 1 Pins (Mics 3 and 4)
#define I2S1_WS 8
#define I2S1_SD 9
#define I2S1_SCK 7

const int SAMPLE_RATE = 16000;
const int BLOCK_SIZE = 1024;
int32_t samples_i2s0[BLOCK_SIZE * 2]; // 2 channels (L/R)
int32_t samples_i2s1[BLOCK_SIZE * 2]; // 2 channels (L/R)

void setupI2S() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = BLOCK_SIZE,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };

  // Configure I2S0
  i2s_pin_config_t pin_config0 = {
    .bck_io_num = I2S0_SCK,
    .ws_io_num = I2S0_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S0_SD
  };
  i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_NUM_0, &pin_config0);

  // Configure I2S1
  i2s_pin_config_t pin_config1 = {
    .bck_io_num = I2S1_SCK,
    .ws_io_num = I2S1_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S1_SD
  };
  i2s_driver_install(I2S_NUM_1, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_NUM_1, &pin_config1);
}

void setup() {
  // Initialize Native USB Serial for data output
  USB.begin();
  Serial.begin(115200);
  
  setupI2S();
  Serial.println("4-Mic Array Initialized.");
}

void loop() {
  size_t bytesRead0 = 0;
  size_t bytesRead1 = 0;

  // Read data from all 4 mics simultaneously
  i2s_read(I2S_NUM_0, &samples_i2s0, sizeof(samples_i2s0), &bytesRead0, portMAX_DELAY);
  i2s_read(I2S_NUM_1, &samples_i2s1, sizeof(samples_i2s1), &bytesRead1, portMAX_DELAY);

  if (bytesRead0 > 0 && bytesRead1 > 0) {
    // Process TDoA / Cross-Correlation here using the 4 captured buffers
    // e.g., Mic 1 = samples_i2s0[0, 2, 4...], Mic 2 = samples_i2s0[1, 3, 5...]
    
    // Example USB Output
    int calculatedAngle = 45; // Placeholder for DSP output
    Serial.printf("Voice detected at angle: %d degrees\n", calculatedAngle);
  }
}
