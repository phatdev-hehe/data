TITLE: Transcribing audio using Whisper in Python
DESCRIPTION: Python code snippet demonstrating how to load a Whisper model and transcribe an audio file.
SOURCE: https://github.com/openai/whisper/blob/main/README.md#2025-04-22_snippet_4

LANGUAGE: python
CODE:
```
import whisper

model = whisper.load_model("turbo")
result = model.transcribe("audio.mp3")
print(result["text"])
```

----------------------------------------

TITLE: Advanced Whisper usage in Python
DESCRIPTION: Python code example showing low-level access to Whisper model for language detection and audio decoding.
SOURCE: https://github.com/openai/whisper/blob/main/README.md#2025-04-22_snippet_5

LANGUAGE: python
CODE:
```
import whisper

model = whisper.load_model("turbo")

# load audio and pad/trim it to fit 30 seconds
audio = whisper.load_audio("audio.mp3")
audio = whisper.pad_or_trim(audio)

# make log-Mel spectrogram and move to the same device as the model
mel = whisper.log_mel_spectrogram(audio, n_mels=model.dims.n_mels).to(model.device)

# detect the spoken language
_, probs = model.detect_language(mel)
print(f"Detected language: {max(probs, key=probs.get)}")

# decode the audio
options = whisper.DecodingOptions()
result = whisper.decode(model, mel, options)

# print the recognized text
print(result.text)
```

----------------------------------------

TITLE: Running Inference on LibriSpeech Dataset
DESCRIPTION: Processes the dataset through the Whisper model, collecting transcription hypotheses and reference texts for later evaluation.
SOURCE: https://github.com/openai/whisper/blob/main/notebooks/LibriSpeech.ipynb#2025-04-22_snippet_6

LANGUAGE: python
CODE:
```
hypotheses = []
references = []

for mels, texts in tqdm(loader):
    results = model.decode(mels, options)
    hypotheses.extend([result.text for result in results])
    references.extend(texts)
```

----------------------------------------

TITLE: Calculating Word Error Rate (WER)
DESCRIPTION: Computes the Word Error Rate between normalized reference and hypothesis transcriptions to evaluate Whisper model performance.
SOURCE: https://github.com/openai/whisper/blob/main/notebooks/LibriSpeech.ipynb#2025-04-22_snippet_10

LANGUAGE: python
CODE:
```
wer = jiwer.wer(list(data["reference_clean"]), list(data["hypothesis_clean"]))

print(f"WER: {wer * 100:.2f} %")
```

----------------------------------------

TITLE: Setting Decoding Options
DESCRIPTION: Configures the decoding options for Whisper, specifying English language and disabling timestamps for short-form transcription.
SOURCE: https://github.com/openai/whisper/blob/main/notebooks/LibriSpeech.ipynb#2025-04-22_snippet_5

LANGUAGE: python
CODE:
```
# predict without timestamps for short-form transcription
options = whisper.DecodingOptions(language="en", without_timestamps=True)
```

----------------------------------------

TITLE: Transcribing audio files using Whisper CLI
DESCRIPTION: Command-line examples for transcribing audio files using Whisper, including specifying the model, language, and translation task.
SOURCE: https://github.com/openai/whisper/blob/main/README.md#2025-04-22_snippet_3

LANGUAGE: bash
CODE:
```
whisper audio.flac audio.mp3 audio.wav --model turbo
```

LANGUAGE: bash
CODE:
```
whisper japanese.wav --language Japanese
```

LANGUAGE: bash
CODE:
```
whisper japanese.wav --language Japanese --task translate
```

----------------------------------------

TITLE: Loading Whisper Model
DESCRIPTION: Loads the base English Whisper model and prints information about whether it's multilingual and its parameter count.
SOURCE: https://github.com/openai/whisper/blob/main/notebooks/LibriSpeech.ipynb#2025-04-22_snippet_4

LANGUAGE: python
CODE:
```
model = whisper.load_model("base.en")
print(
    f"Model is {'multilingual' if model.is_multilingual else 'English-only'} "
    f"and has {sum(np.prod(p.shape) for p in model.parameters()):,} parameters."
)
```

----------------------------------------

TITLE: Normalizing Transcriptions
DESCRIPTION: Applies text normalization to both hypotheses and references to ensure fair comparison, standardizing text format, capitalization, and punctuation.
SOURCE: https://github.com/openai/whisper/blob/main/notebooks/LibriSpeech.ipynb#2025-04-22_snippet_9

LANGUAGE: python
CODE:
```
data["hypothesis_clean"] = [normalizer(text) for text in data["hypothesis"]]
data["reference_clean"] = [normalizer(text) for text in data["reference"]]
data
```

----------------------------------------

TITLE: Creating a LibriSpeech Dataset Wrapper Class
DESCRIPTION: Implements a custom PyTorch dataset class that wraps the LibriSpeech dataset, handling audio preprocessing including trimming or padding audio to 30 seconds and converting to mel spectrograms.
SOURCE: https://github.com/openai/whisper/blob/main/notebooks/LibriSpeech.ipynb#2025-04-22_snippet_2

LANGUAGE: python
CODE:
```
class LibriSpeech(torch.utils.data.Dataset):
    """
    A simple class to wrap LibriSpeech and trim/pad the audio to 30 seconds.
    It will drop the last few seconds of a very small portion of the utterances.
    """
    def __init__(self, split="test-clean", device=DEVICE):
        self.dataset = torchaudio.datasets.LIBRISPEECH(
            root=os.path.expanduser("~/.cache"),
            url=split,
            download=True,
        )
        self.device = device

    def __len__(self):
        return len(self.dataset)

    def __getitem__(self, item):
        audio, sample_rate, text, _, _, _ = self.dataset[item]
        assert sample_rate == 16000
        audio = whisper.pad_or_trim(audio.flatten()).to(self.device)
        mel = whisper.log_mel_spectrogram(audio)
        
        return (mel, text)
```

----------------------------------------

TITLE: Initializing Dataset and DataLoader
DESCRIPTION: Creates an instance of the LibriSpeech wrapper class with the 'test-clean' split and sets up a PyTorch DataLoader with batch size 16.
SOURCE: https://github.com/openai/whisper/blob/main/notebooks/LibriSpeech.ipynb#2025-04-22_snippet_3

LANGUAGE: python
CODE:
```
dataset = LibriSpeech("test-clean")
loader = torch.utils.data.DataLoader(dataset, batch_size=16)
```

----------------------------------------

TITLE: Installing Whisper using pip
DESCRIPTION: Commands to install the latest release of Whisper or the latest commit from the repository using pip.
SOURCE: https://github.com/openai/whisper/blob/main/README.md#2025-04-22_snippet_0

LANGUAGE: bash
CODE:
```
pip install -U openai-whisper
```

LANGUAGE: bash
CODE:
```
pip install git+https://github.com/openai/whisper.git
```

LANGUAGE: bash
CODE:
```
pip install --upgrade --no-deps --force-reinstall git+https://github.com/openai/whisper.git
```

----------------------------------------

TITLE: Setting Up Environment and Dependencies
DESCRIPTION: Imports necessary libraries and sets up the device for processing (CUDA if available, otherwise CPU).
SOURCE: https://github.com/openai/whisper/blob/main/notebooks/LibriSpeech.ipynb#2025-04-22_snippet_1

LANGUAGE: python
CODE:
```
import os
import numpy as np

try:
    import tensorflow  # required in Colab to avoid protobuf compatibility issues
except ImportError:
    pass

import torch
import pandas as pd
import whisper
import torchaudio

from tqdm.notebook import tqdm


DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
```

----------------------------------------

TITLE: Importing Text Normalization Tools
DESCRIPTION: Imports the jiwer library for WER calculation and Whisper's English text normalizer to standardize text before evaluation.
SOURCE: https://github.com/openai/whisper/blob/main/notebooks/LibriSpeech.ipynb#2025-04-22_snippet_8

LANGUAGE: python
CODE:
```
import jiwer
from whisper.normalizers import EnglishTextNormalizer

normalizer = EnglishTextNormalizer()
```

----------------------------------------

TITLE: Creating DataFrame with Results
DESCRIPTION: Organizes the transcription hypotheses and reference texts into a pandas DataFrame for analysis.
SOURCE: https://github.com/openai/whisper/blob/main/notebooks/LibriSpeech.ipynb#2025-04-22_snippet_7

LANGUAGE: python
CODE:
```
data = pd.DataFrame(dict(hypothesis=hypotheses, reference=references))
data
```

----------------------------------------

TITLE: Installing Whisper and Evaluation Packages
DESCRIPTION: Installs the Whisper model from GitHub repository and jiwer package for calculating Word Error Rate (WER) metrics.
SOURCE: https://github.com/openai/whisper/blob/main/notebooks/LibriSpeech.ipynb#2025-04-22_snippet_0

LANGUAGE: python
CODE:
```
! pip install git+https://github.com/openai/whisper.git
! pip install jiwer
```

----------------------------------------

TITLE: Installing ffmpeg on various platforms
DESCRIPTION: Commands to install ffmpeg, a required command-line tool, on different operating systems using their respective package managers.
SOURCE: https://github.com/openai/whisper/blob/main/README.md#2025-04-22_snippet_1

LANGUAGE: bash
CODE:
```
# on Ubuntu or Debian
sudo apt update && sudo apt install ffmpeg

# on Arch Linux
sudo pacman -S ffmpeg

# on MacOS using Homebrew (https://brew.sh/)
brew install ffmpeg

# on Windows using Chocolatey (https://chocolatey.org/)
choco install ffmpeg

# on Windows using Scoop (https://scoop.sh/)
scoop install ffmpeg
```

----------------------------------------

TITLE: Whisper Model Size Specifications Table
DESCRIPTION: Markdown table displaying the various Whisper model sizes, their parameter counts, and language support capabilities for both English-only and multilingual versions.
SOURCE: https://github.com/openai/whisper/blob/main/model-card.md#2025-04-22_snippet_0

LANGUAGE: markdown
CODE:
```
|  Size  | Parameters | English-only model | Multilingual model |
|:------:|:----------:|:------------------:|:------------------:|
|  tiny  |    39 M    |         ✓          |         ✓          |
|  base  |    74 M    |         ✓          |         ✓          |
| small  |   244 M    |         ✓          |         ✓          |
| medium |   769 M    |         ✓          |         ✓          |
| large  |   1550 M   |                    |         ✓          |
| turbo  |   798 M    |                    |         ✓          |
```

----------------------------------------

TITLE: Installing setuptools-rust
DESCRIPTION: Command to install setuptools-rust, which may be required if the installation fails due to missing setuptools_rust module.
SOURCE: https://github.com/openai/whisper/blob/main/README.md#2025-04-22_snippet_2

LANGUAGE: bash
CODE:
```
pip install setuptools-rust
```

----------------------------------------

TITLE: Markdown Changelog Documentation
DESCRIPTION: Detailed version history for the Whisper project, documenting releases from the first versioned release in January 2023 through September 2024. Includes pull request references and descriptions of changes.
SOURCE: https://github.com/openai/whisper/blob/main/CHANGELOG.md#2025-04-22_snippet_0

LANGUAGE: markdown
CODE:
```
# CHANGELOG

## [v20240930](https://github.com/openai/whisper/releases/tag/v20240930)

* allowing numpy 2 in tests ([#2362](https://github.com/openai/whisper/pull/2362))
* large-v3-turbo model ([#2361](https://github.com/openai/whisper/pull/2361))
* test on python/pytorch versions up to 3.12 and 2.4.1 ([#2360](https://github.com/openai/whisper/pull/2360))
* using sdpa if available ([#2359](https://github.com/openai/whisper/pull/2359))
```

----------------------------------------

TITLE: Converting wav.scp to WAV files for CallHome & Switchboard datasets
DESCRIPTION: This bash script converts the wav.scp file entries to individual WAV files for the CallHome and Switchboard datasets. It creates a 'wav' directory and processes each entry in the wav.scp file.
SOURCE: https://github.com/openai/whisper/blob/main/data/README.md#2025-04-22_snippet_0

LANGUAGE: bash
CODE:
```
mkdir -p wav
while read name cmd; do
    echo $name
    echo ${cmd/\|/} wav/$name.wav | bash
done < wav.scp
```