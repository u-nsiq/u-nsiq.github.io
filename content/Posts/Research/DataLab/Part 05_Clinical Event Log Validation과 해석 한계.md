---
title: "Part 05. Clinical Event Log Validation과 해석 한계"
date: 2026-04-07
modified: 2026-04-28
draft: false
---

## 들어가며

Event log를 구성한 뒤에는 해당 log를 어떻게 해석할 수 있는지 점검해야 했다. Healthcare EHR data는 실제 임상 행위가 발생한 시점과 기록이 입력된 시점이 다를 수 있고, 같은 clinical fact가 여러 table에 중복 기록될 수도 있다.

따라서 validation의 목적은 event log가 완전히 정제되었다고 주장하는 것이 아니라, process mining 해석 전에 확인해야 할 data imperfection을 분류하는 것이었다.

이 글에서는 Master/Child Window validation 이후, Suriadi event log imperfection patterns를 참고해 batch timestamp, missing case linkage, cross-table redundancy, machine-like logging, label quality를 검토한 과정을 정리한다.

## 이 글에서 다루는 것

- validation을 event log 해석 가능성 점검으로 본 이유
- Suriadi event log imperfection patterns의 사용 방식
- batch timestamp와 machine-like logging
- missing `hadm_id`, ED linkage, cross-table redundancy
- metric을 stage별로 분리해서 해석해야 하는 이유

---

## 1. Validation의 범위

이 작업의 validation은 complete formal remediation framework가 아니라 selected validation에 가깝다. 다만 단순 확인이 아니라, 생성된 event log를 process mining에 사용하기 전에 어떤 구조적 문제가 있는지 확인하는 과정이었다.

검증 질문은 다음과 같았다.

| Question | Why it mattered |
|---|---|
| event가 admission/stay window 안에 있는가? | trace boundary integrity |
| missing `hadm_id`는 오류인가, ED/out-of-scope record인가? | case linkage quality |
| 동일 timestamp event는 duplicate인가, batch entry인가? | ordering and frequency interpretation |
| 서로 다른 table이 같은 clinical fact를 중복 기록하는가? | source priority |
| high-frequency logging은 clinical decision event인가? | process model interpretation |
| label은 process activity로 읽을 수 있는가? | activity abstraction quality |

이 질문들은 process mining 결과 해석과 연결된다. Event count, timestamp ordering, source overlap, activity label이 모두 process model의 형태와 해석에 영향을 주기 때문이다.

## 2. Construction Validation

첫 번째 validation은 baseline construction 자체에 포함되어 있었다. Master Window, Child Window, TRUE_END, Strict Filtering은 trace boundary integrity를 위한 construction rule이기도 했다.

| Check | Decision |
|---|---|
| Master Window | `[admittime, TRUE_END]` |
| TRUE_END | `COALESCE(deathtime, dischtime)` |
| invalid admission | `admittime > TRUE_END` 1 case removed |
| Child Window | `stay_id` events must fit `[intime, outtime]` |
| missing ICU outtime | selected terminal cases imputed with `TRUE_END` |
| reversed duration | invalid duration rows removed |
| outside-window events | strict filtering rather than timestamp capping |

이 validation은 별도 후처리가 아니라 baseline event log를 구성하기 위한 조건이었다. Care window 밖 event를 그대로 포함하면 admission-level trace의 의미가 불분명해질 수 있다.

## 3. Suriadi Imperfection Patterns

품질 검토에서는 Suriadi et al.의 event log imperfection patterns를 reference frame으로 사용했다. 이 framework는 healthcare EHR에 그대로 적용되는 완성된 답안이라기보다, 어떤 유형의 문제를 확인해야 하는지 정리해주는 checklist에 가까웠다.

| Area | Pattern family | How it was used |
|---|---|---|
| Data capture | P1-P4 | timestamp batching, time validity, missing timestamps, duration handling |
| Event-case mapping | P5-P7 | missing case linkage, scattered case, collateral event |
| Label quality | P8-P11 | polluted/distorted/synonymous/homonymous labels |

모든 pattern을 같은 깊이로 remediation하지는 않았다. 이 event log에서는 P1 batch timestamp, P5/P6 missing case linkage, P7 cross-table redundancy, machine-like logging을 중심으로 해석했다.

## 4. P1: Batch Timestamp

EHR event log에서는 동일 timestamp에 여러 event가 몰리는 현상이 자주 나타난다. 이는 여러 measurement가 동시에 charting되었거나, shift change나 nursing documentation 과정에서 여러 record가 한 번에 입력되었기 때문일 수 있다.

따라서 동일 timestamp event를 모두 duplicate으로 처리할 수는 없다. Batch entry와 duplicate은 구분해야 한다.

이 프로젝트에서는 batch behavior를 보기 위해 Compression Ratio를 사용했다.

| Metric | Value |
|---|---:|
| Compression Ratio | 12.05 |

Compression Ratio는 timestamp-level grouping의 강도를 보는 데 사용했다. 반면 batch percentage는 denominator 정의에 따라 값이 달라질 수 있어 headline metric으로 사용하지 않았다.

이 결과는 MIMIC-IV event log가 realtime event stream이라기보다 documented clinical snapshot의 성격을 갖는다는 해석으로 이어졌다. 특히 `chartevents` 중심의 batch가 event frequency에 큰 영향을 주었다.

## 5. P5/P6: Missing Case와 ED Linkage

Missing `hadm_id`는 단일한 오류로 처리하기 어려웠다. 일부 row는 target admission 밖의 record였고, 일부는 ED context를 통해 later hospital admission과 연결될 수 있었다.

분류 관점은 다음과 같았다.

| Category | Meaning |
|---|---|
| ED Link | ED event connected to a later hospital admission |
| In-Stay | subject/time logic으로 admission window 안에 들어오는 event |
| ED Only | ED에서만 발생하고 target admission으로 이어지지 않는 record |
| Out-of-Scope | outpatient, unrelated, or post-window record |

Missing `hadm_id` row를 모두 삭제하면 admission 직전 ED context가 사라질 수 있다. 반대로 모두 유지하면 admission-level trace가 out-of-scope event로 오염될 수 있다. 따라서 missing case linkage는 row-level 오류라기보다 care setting과 dataset schema의 관계로 해석했다.

후반 검토에서는 transfers out-of-scope record가 ED visit과 관련된 경우도 확인했다. 이 결과는 MIMIC-IV 구조 자체의 오류라기보다 ED stay와 hospital admission이 별도 구조로 기록되는 데서 생기는 linkage issue로 정리했다.

## 6. P7: Cross-Table Redundancy

Healthcare EHR에서는 같은 clinical fact가 여러 source table에 기록될 수 있다. 예를 들어 lab-like measurement가 `chartevents`와 `labevents` 양쪽에 나타날 수 있다.

이 프로젝트에서는 `chartevents`와 `labevents` 사이의 broad same-case/time/label overlap signal을 확인했다.

| Pair | Finding |
|---|---|
| `chartevents` and `labevents` | broad same-case/time/label overlap signal: 19 exact matched labels / 2,248,623 rows |
| `chartevents` and `outputevents` | high overlap signal observed |

이 결과를 모든 overlap row의 삭제 근거로 사용하지는 않았다. Source마다 기록 목적과 clinical meaning이 다를 수 있기 때문이다. 대신 downstream analysis에서는 source priority가 필요하다고 정리했다.

예를 들어 lab-like interpretation에서는 `labevents`가 더 직접적인 source가 될 수 있다. 반면 `chartevents`는 ICU documentation과 monitoring의 넓은 범위를 담으므로 raw/baseline에는 포함하되, frequency 해석에는 주의가 필요하다.

## 7. Machine-Like Logging

Suriadi pattern만으로는 healthcare EHR의 device/protocol logging 성격을 충분히 설명하기 어렵다. 따라서 time interval pattern을 별도로 확인했다.

| Pattern | Typical source | Interpretation |
|---|---|---|
| 60/120-minute periodic logging | `chartevents`, `outputevents` | repeated monitoring / documentation rhythm |
| 1-minute rapid fragmentation | `procedureevents`, `inputevents` | duration or protocol-driven fragmentation |
| irregular clinical testing rhythm | `labevents` | closer to ordered clinical tests |

이 구분은 event frequency 해석에 영향을 준다. Event count가 많다고 해서 clinical decision point가 많다는 뜻은 아니다. 반복 measurement, documentation protocol, device logging이 count를 증가시킬 수 있다.

## 8. Label Quality

Activity label quality에서는 polluted label, distorted label, synonymous label, homonymous label 문제를 검토했다.

| Pattern | Example issue | Handling |
|---|---|---|
| P8 Polluted Label | numeric/device suffix in labels | detect, normalize where needed |
| P9 Distorted Label | capitalization or spelling variants | normalize cautiously |
| P10 Synonymous Label | different labels for same concept | grouping/mapping issue |
| P11 Homonymous Label | same label used in different contexts | require source/context disambiguation |

이 영역은 full remediation보다 activity abstraction이 흔들릴 수 있는 지점을 확인하는 데 의미가 있었다. 특히 source context를 제거하면 homonymous label 문제가 커질 수 있으므로, `source_table` provenance를 유지했다.

## 9. Validation 이후의 해석 기준

Validation 결과, event log를 해석할 때 다음과 같은 기준을 두었다.

| Before validation | After validation |
|---|---|
| high event count means more clinical activity | high count may reflect monitoring/documentation intensity |
| same timestamp means duplicate | same timestamp may be batch entry or collateral event |
| missing `hadm_id` means bad row | can be ED-linked, in-stay, ED-only, or out-of-scope |
| `chartevents` is just another source | dominant source requiring source-priority handling |
| one final event count is enough | every count needs a stage label |

이 기준은 baseline L0, refinement branch, analysis-level view를 구분해서 설명하는 데 사용했다.

## 10. Limitations

이 validation은 모든 문제를 해결한 것은 아니다. Suriadi patterns를 reference frame으로 사용했지만 모든 pattern을 완전 remediation하지는 않았다. `chartevents` redundancy는 downstream view마다 source priority가 필요하고, label quality remediation도 analysis purpose에 따라 달라질 수 있다.

Raw clinical data를 repository에 포함할 수 없기 때문에 credentialed access가 없는 reader가 full rerun을 수행하기도 어렵다. GitHub repository에는 aggregate-level query output과 construction logic을 중심으로 정리했다.

Headline에는 stage label이 안정적인 값만 사용했다.

| Stage / View | Headline value |
|---|---:|
| MIMIC-IV baseline cohort | 13,471 admissions / 11,081 patients |
| Baseline L0 event log | 76,062,216 events |
| L2 + 5-minute analysis view | 10,483,531 events |
| Reduction from L0 to analysis view | 86.2% |

## 정리

Validation은 event log의 완전성을 주장하기 위한 단계가 아니라, EHR event log의 structural imperfection을 확인하고 해석 기준을 정리하는 단계였다.

이 과정을 통해 batch timestamp, missing case linkage, cross-table redundancy, high-volume charting을 별도로 설명할 수 있었고, event count와 activity view를 stage별로 구분하는 기준을 세웠다.

## 관련 자료

- GitHub 문서: [docs/05_validation_and_limitations.md](https://github.com/u-nsiq/clinical-event-log-process-mining/blob/main/docs/05_validation_and_limitations.md)
- Notebook: [research_notebooks/05_validation_and_limitations.ipynb](https://github.com/u-nsiq/clinical-event-log-process-mining/blob/main/research_notebooks/05_validation_and_limitations.ipynb)
- Repository: [clinical-event-log-process-mining](https://github.com/u-nsiq/clinical-event-log-process-mining)
