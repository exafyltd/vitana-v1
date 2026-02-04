class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = [];
        // 4096 samples = ~256ms at 16kHz
        this.bufferSize = 4096;
    }

    process(inputs) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const channelData = input[0];

            // Push data to buffer
            for (let i = 0; i < channelData.length; i++) {
                this.buffer.push(channelData[i]);
            }

            // When buffer is full, flush it
            while (this.buffer.length >= this.bufferSize) {
                const chunk = new Float32Array(this.buffer.splice(0, this.bufferSize));
                this.port.postMessage(chunk);
            }
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
