---
title: "Part 02. MIMIC-IV EHR Table의 Event Log Schema 설계"
date: 2026-03-27
modified: 2026-04-28
draft: false
---

## 들어가며

이전 글에서는 sepsis admission cohort를 정의한 과정을 정리했다. Cohort가 정해진 뒤에는 MIMIC-IV의 여러 EHR table을 process mining에서 사용할 수 있는 event log 형태로 변환해야 했다.

MIMIC-IV는 진단, 처방, 실제 투약, 검사, ICU 입퇴실, 병동 이동, charted measurement가 서로 다른 table에 나뉘어 있다. 각 table은 기록 목적과 timestamp의 의미가 다르기 때문에, 모든 row를 동일한 event로 볼 수 없다.

이 글에서는 `hadm_id`를 case notion으로 선택하고, source table을 event / attribute / support table로 구분한 뒤, 서로 다른 EHR table을 하나의 normalized event schema로 맞춘 과정을 설명한다.

## 이 글에서 다루는 것

- `subject_id`, `hadm_id`, `stay_id` 중 `hadm_id`를 case notion으로 선택한 이유
- EHR table을 event source로 포함하기 위한 기준
- `diagnoses_icd`, `POE`, `prescriptions`를 event source로 보지 않은 이유
- 서로 다른 source table을 통합하기 위한 normalized event schema
- `chartevents`를 baseline source에 포함하되 별도 validation 대상으로 본 이유

---

## 1. Case Notion 설정

Process mining에서 `case_id`는 하나의 trace boundary를 결정한다. EHR에서는 이 선택지가 여러 개다. 환자 단위의 `subject_id`, 입원 단위의 `hadm_id`, ICU stay 단위의 `stay_id`를 각각 case로 볼 수 있다.

초기에는 `hadm_id`와 `stay_id`의 관계를 확인하는 작업이 필요했다. 한 환자는 여러 번 입원할 수 있고, 하나의 admission 안에서도 여러 ICU stay가 나타날 수 있다. ICU stay를 top-level case로 선택하면 ICU 밖의 ED, ward, discharge event가 잘릴 수 있었다.

최종 case notion은 `hadm_id`로 정리했다. Sepsis 환자의 hospital admission journey를 하나의 process instance로 보고, ICU stay는 trace 안의 context로 보존하는 방식이다.

| Candidate | Unit | Decision |
|---|---|---|
| `subject_id` | patient | 여러 admission이 하나의 long trace로 합쳐질 수 있어 기본 case로 사용하지 않음 |
| `hadm_id` | hospital admission | top-level case notion |
| `stay_id` | ICU stay | ICU context attribute로 보존 |

`stay_id`는 nullable context attribute로 남겼다. 이를 통해 기본 trace는 admission-level로 유지하면서, ICU-specific event를 나중에 별도로 해석할 수 있도록 했다.

## 2. Event와 Attribute의 구분

EHR table을 event log로 변환할 때는 clinically relevant한 table을 모두 event로 넣을 수 없다. Process mining에서 event는 시간 순서로 정렬 가능해야 하며, patient process 안에서 발생한 record로 해석할 수 있어야 한다.

`diagnoses_icd`는 sepsis cohort definition에는 핵심 table이지만, event timestamp가 없다. 따라서 event source가 아니라 cohort filter, admission attribute, severity subgroup으로 사용했다.

`POE`는 physician order entry에 가까운 table이다. Order가 입력되었다는 사실은 중요하지만, 그것이 환자에게 실제로 수행된 event와 항상 일치하지는 않는다. 이 이유로 baseline event source에서 제외했다.

`prescriptions`도 medication 관련 table이지만 actual administration record는 아니다. Medication event source는 `emar`로 두고, `prescriptions`는 drug identifier와 mapping 정보를 보조하는 support table로 사용했다.

## 3. Normalized Event Schema

서로 다른 source table을 하나의 event log로 합치기 위해 공통 schema를 정의했다. 핵심 field는 다음과 같다.

| Field | Role |
|---|---|
| `subject_id` | patient identifier |
| `hadm_id` | case identifier |
| `stay_id` | ICU stay context, nullable |
| `event_timestamp` | event ordering timestamp |
| `activity_l0` | source-native activity label or item identifier |
| `activity_l1` | table-specific abstraction |
| `activity_l2` | broader analysis-level abstraction |
| `source_table` | provenance |
| `event_type` | conversion type or event family |

이 schema에서 `source_table`과 `activity_l0`를 보존한 이유는 provenance 때문이다. L1/L2 abstraction을 적용하더라도, event가 어떤 table에서 왔고 원래 어떤 source-native label을 가졌는지 추적할 수 있어야 했다.

## 4. Event Source Table

Baseline event log는 timestamp가 있고 patient-process record로 해석 가능한 10개 source table을 중심으로 구성했다.

| Source table | Event meaning | Conceptual conversion |
|---|---|---|
| `admissions` | admission/discharge/death boundary | Boundary pair |
| `icustays` | ICU admission/discharge | Movement pair |
| `transfers` | ward/unit movement | Movement pair |
| `labevents` | lab test/result | One-off |
| `emar` | medication administration | One-off |
| `inputevents` | ICU input/infusion | Duration-like start/complete pair |
| `outputevents` | output measurement | One-off |
| `procedureevents` | ICU procedure/treatment | Duration-like start/complete pair |
| `chartevents` | charted measurement/observation | One-off |
| `microbiologyevents` | microbiology culture/test | One-off |

이 목록은 MIMIC-IV에서 임상적으로 중요한 table 전체를 의미하지 않는다. 이 event log construction에서 timestamp와 case linkage를 기준으로 event source로 사용할 수 있다고 본 table set이다.

## 5. Event Conversion Pattern

Source table마다 event로 변환되는 방식이 달랐다. 따라서 table별 SELECT를 만들기 전에 conceptual conversion pattern을 구분했다.

`admissions`는 admission start와 discharge/death boundary를 만든다. `icustays`와 `transfers`는 entry/exit movement event를 만든다. `inputevents`와 `procedureevents`처럼 start/end timestamp를 가진 table은 duration-like source로 보았다. `labevents`, `emar`, `chartevents`, `microbiologyevents`, `outputevents`는 한 row가 하나의 timestamped event가 되는 one-off source에 가깝다.

기본 construction shape는 다음과 같다.

```text
source-specific SELECT
  -> normalized schema
  -> UNION ALL
  -> cohort/window filtering
  -> baseline event log
```

구조는 단순해 보이지만, 실제 작업은 source-specific rule을 정하는 데 있었다. 어떤 timestamp를 사용할지, 어떤 row를 제외할지, `stay_id`가 없는 event를 어떻게 둘지, activity label을 어떤 수준으로 만들지 모두 source별로 결정해야 했다.

## 6. Medication Event Decision

Medication source는 order와 actual administration을 구분해서 다뤘다. `prescriptions`는 drug order/prescription record이고, `emar`는 실제 투약 administration record에 가깝다.

최종 medication event source는 `emar`로 두었다. `emar`는 투약이 실제로 기록된 timestamp를 포함하므로 event log의 event에 더 가깝다. 반면 `prescriptions`는 `pharmacy_id`, NDC, drug name 등 medication abstraction에 필요한 정보를 보조하는 table로 사용했다.

이 구조는 medication 관련 record를 다음처럼 나누어 해석한 것이다.

```text
prescriptions: order / drug identifier support
emar: administration event source
```

## 7. `chartevents` Position

`chartevents`는 baseline event log에서 가장 큰 source였다. Baseline L0 기준으로 55,347,183 events, 전체의 72.77%를 차지했다.

이 table에는 bedside charting, device/protocol logging, repeated measurement가 섞여 있다. 따라서 event frequency를 clinical importance로 바로 해석하기 어렵다. 동일 timestamp batch behavior도 강하고, 일부 label은 `labevents`나 `outputevents`와 중복될 수 있다.

최종 정리는 다음에 가깝다.

```text
chartevents는 raw/baseline construction에는 포함한다.
다만 dominance, batching, cross-table redundancy는 validation과 analysis view에서 별도로 관리한다.
```

따라서 `chartevents`는 제외된 source가 아니라, baseline에 포함하되 downstream 해석에서 주의가 필요한 high-volume source로 두었다.

## 8. Stage Label

이 프로젝트에서는 event count가 stage마다 달라진다. Raw integration, baseline L0 event log, refinement branch, analysis-level view가 서로 다른 artifact이기 때문이다.

| Stage | Meaning |
|---|---|
| raw integration | broad source extraction before final filtering or aggregation |
| baseline L0 event log | source-native events after cohort/window rules |
| refinement branch | duplicate/redundancy-oriented cleanup branch |
| analysis-level view | abstraction and time-window aggregation for process mining |

따라서 event count는 항상 stage label과 함께 해석해야 한다. 111M, 76M, 21M, 10.5M 규모의 숫자는 서로 경쟁하는 최종값이 아니라 서로 다른 construction stage의 산출물이다.

## 정리

이 단계의 설계는 단순 schema 변환보다 source별 timestamp 의미와 event 여부를 구분하는 작업에 가까웠다. `hadm_id`를 case notion으로 두고, `stay_id`를 context로 보존하며, event source와 support table을 분리했다.

이 schema와 source decision을 바탕으로 다음 단계에서는 admission/stay window를 적용한 baseline event log construction을 진행했다.

## 관련 자료

- GitHub 문서: [docs/02_event_log_design.md](https://github.com/u-nsiq/clinical-event-log-process-mining/blob/main/docs/02_event_log_design.md)
- Notebook: [research_notebooks/02_event_log_design.ipynb](https://github.com/u-nsiq/clinical-event-log-process-mining/blob/main/research_notebooks/02_event_log_design.ipynb)
- Repository: [clinical-event-log-process-mining](https://github.com/u-nsiq/clinical-event-log-process-mining)
