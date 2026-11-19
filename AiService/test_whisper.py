from faster_whisper import WhisperModel

print("Loading model...")
model = WhisperModel("small", device="cpu", compute_type="int8")

print("Device:", model.model.device)
print("Compute type:", model.model.compute_type)

segments, info = model.transcribe("test.wav", beam_size=5)

print("Language:", info.language)

for segment in segments:
    print(segment.text)