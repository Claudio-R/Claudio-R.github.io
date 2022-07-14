# Validation Experiment

## Setup
The experiment involved 10 people of age comprised between 20 and 25 years old, no one had formal training in music.
It consisted in 8 sonification tasks designed in this way:
### _Mid1_, _Mid2_, _Mid3_, _Mid4_
Sonified region: __chr1:42,605,207-42,795,200__

Active signals: __all signals__

| Sonification | Gain | Frequency [Hz] | Detune [%] | Stereo Width | Attack [s] | Decay [s] | Sustain [s] | Release [s] |
|--------------|------|----------------|------------|--------------|------------|-----------|-------------|-------------|
| _Mid1_       | 0.5  | 250            | 0.0        | 0.0          | 2.5        | 2.5       | 2.5         | 2.5         |
| _Mid2_       | 0.5  | 250            | 0.2        | 0.0          | 2.5        | 2.5       | 2.5         | 2.5         |
| _Mid3_       | 0.5  | 250            | 0.0        | 1.0          | 2.5        | 2.5       | 2.5         | 2.5         |
| _Mid4_       | 0.5  | 250            | 0.2        | 1.0          | 2.5        | 2.5       | 2.5         | 2.5         |

### _Long1_, _Long2_

Sonified region: __chr1:55,186,270-55,376,263__

Active signals: __all signals__

| Sonification | Gain | Frequency [Hz] | Detune [%] | Stereo Width | Attack [s] | Decay [s] | Sustain [s] | Release [s] |
|--------------|------|----------------|------------|--------------|------------|-----------|-------------|-------------|
| _Long1_      | 0.1  | 100            | 0.2        | 0.0          | 5.0        | 5.0       | 5.0         | 5.0         |
| _Long2_      | 0.8  | 500            | 0.0        | 1.0          | 5.0        | 5.0       | 5.0         | 5.0         |

### _Short1_, _Short2_

Sonified region: __chr1:110,790,818-110,980,812__

Active signals: __all signals__

| Sonification | Gain | Frequency [Hz] | Detune [%] | Stereo Width | Attack [s] | Decay [s] | Sustain [s] | Release [s] |
|--------------|------|----------------|------------|--------------|------------|-----------|-------------|-------------|
| _Short1_     | 0.8  | 500            | 0.0        | 1.0          | 0.01       | 0.05      | 0.1         | 0.1         |
| _Short2_     | 0.1  | 100            | 0.2        | 0.0          | 0.01       | 0.05      | 0.1         | 0.1         |

After each sonification, the subjects were asked three questions:

1. _How many different signals do you perceive?_
2. _What is the maximum number of signals that occur at the same time?_
3. _In a scale from 0 to 10, how confident do you feel about your answers?_

## Results
The results of the test are collected in the _test.xlsx file_.

The __answers__ are gathered in the colums going from _D_ to _M_. The answers to the third question are normalized to 1.

The __correct answers__ are collected in column _R_.

The __average values__ of the answers to each question are reported in column _S_, the __standard deviations__ in column _U_.

The __accuracy values__ for each question defined as the ratio between the average and the correct answer, are collected in column _Y_.

The __custom scores__ are collected in column _AC_.
The custom score is defined as:

$$
    Score = \frac{\Sigma_{i=1}^{N_s}c_i\left(\frac{a_{i,1}}{gt_1} + \frac{a_{i,2}}{gt_2}\right)}{2\Sigma_{i=1}^{N_s}c_i} 
$$

Where $a_{i,1}$ and $a_{i,2}$ are the answers to question 1 and 2 by the subject $i$, while $c_i$ is the self-confidence reported by the same subject; $N_s$, instead, is the number of subjects.

The custom score is defined in this way to give more prominence to responses for which the reported confidence is higher. In particular, the idea is that wrong answers given with a high level of confidence are a symptom that the corresponding sonification completely fails its communicative intent.
