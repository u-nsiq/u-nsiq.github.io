---
title: "Part 01. Sepsis Cohort Definition과 연구 범위 설정"
date: 2026-03-24
modified: 2026-04-28
---

## 들어가며

DataLab 학부연구생 활동의 초기 연구 맥락은 MIMIC-IV를 이용해 traditional process mining과 object-centric process mining을 비교할 수 있는 event log 기반을 준비하는 것이었다.

다만 MIMIC-IV는 process mining을 위해 설계된 데이터셋이 아니다. 환자, 입원, ICU stay, 진단, 처방, 투약, 검사, charting record가 여러 table에 나뉘어 있고, 각 table의 timestamp와 clinical meaning도 다르다. 따라서 process mining 분석에 앞서, 어떤 환자군을 대상으로 event log를 구성할지 먼저 정해야 했다.

이 글에서는 sepsis cohort가 연구 대상으로 수렴된 과정과, Sepsis-3 기준 검토 이후 ICD-10-CM 기반 admission-level cohort로 범위를 정리한 과정을 설명한다.

## 이 글에서 다루는 것

- sepsis가 연구 대상 질병군으로 선택된 배경
- Sepsis-3 기준을 최종 cohort definition으로 사용하지 않은 이유
- ICD-10-CM `A40` / `A41` 기준으로 cohort를 정의한 방식
- `13,480`, `13,472`, `13,471` count의 stage별 의미
- 이 cohort definition의 해석 범위와 한계

---

## 1. 질병군 선정의 기준

초기에는 MIMIC-IV 전체 admission과 ICU stay를 여러 관점에서 탐색했다. 전체 admission volume, ICU admission, 사망률, 연령대별 주요 질병군, chronic disease 환자의 acute trigger 등을 확인하면서 process mining에 적합한 질병군을 찾는 단계였다.

질병군을 고를 때 단순히 빈도가 높은 diagnosis를 선택하는 것은 충분하지 않았다. Event log로 만들었을 때 trace가 해석 가능해야 하고, ICU event source를 충분히 활용할 수 있어야 하며, validation과 downstream analysis를 수행할 수 있을 만큼 sample size도 필요했다.

Sepsis는 여러 탐색 관점에서 반복적으로 나타났다. ICU와의 연결성이 높고, acute illness라 admission-level journey로 해석하기 적합했다. Infection suspicion, antibiotics, culture, organ support, ICU transfer 등 process mining 관점에서 event 흐름으로 볼 수 있는 요소도 비교적 분명했다.

반면 sepsis가 모든 lens에서 가장 강한 질병군이었던 것은 아니다. Readmission, length of stay, event density처럼 장기 치료나 만성질환이 우세한 관점에서는 다른 질환이 더 두드러질 수 있었다. 최종 선택은 hospital/ICU burden, mortality, acute care process라는 축에서 sepsis가 event log construction 대상으로 적합하다는 판단에 가까웠다.

## 2. Sepsis-3 기준 검토

초기에는 Sepsis-3 criteria도 검토했다. Sepsis-3는 infection suspicion과 SOFA score를 함께 사용하므로, ICD code 기반 정의보다 임상적으로 더 직접적인 기준처럼 보였다.

하지만 실제 구현 범위에서는 문제가 있었다. SOFA score를 안정적으로 재현하려면 6개 organ system에 해당하는 여러 variable을 table별로 모아야 한다. Missing value 처리, 시간 window 설정, ICU 밖 기록의 처리 방식도 별도로 결정해야 한다.

또한 Sepsis-3 구현은 ICU stay 중심으로 구성되기 쉽다. 반면 이 프로젝트의 기본 trace는 ICU stay가 아니라 hospital admission journey였다. `hadm_id`를 중심으로 입원부터 퇴원 또는 사망까지의 흐름을 구성하려는 작업과 Sepsis-3 onset cohort는 분석 단위가 다를 수 있었다.

따라서 Sepsis-3는 최종 cohort definition이 아니라, 범위 조정을 위한 검토 branch로 남겼다. 이후 작업은 event log construction에 필요한 reproducible admission-level boundary를 우선하는 방향으로 정리했다.

## 3. ICD-10-CM 기반 Cohort Definition

최종 MIMIC-IV cohort는 `diagnoses_icd` table의 ICD-10-CM code를 사용해 정의했다. Primary inclusion은 `A40%`와 `A41%`였다.

| Code group | Meaning | Role |
|---|---|---|
| `A40%` | Streptococcal sepsis | primary inclusion |
| `A41%` | Other sepsis | primary inclusion |
| `R65.20` | Severe sepsis without septic shock | severity tag |
| `R65.21` | Severe sepsis with septic shock | severity tag |

`R65.2x`는 severe sepsis / septic shock을 나타내지만, underlying infection code와 함께 쓰이는 secondary code 성격이 있다. 따라서 primary inclusion으로 사용하지 않고, A40/A41 cohort 안에서 severity subgroup을 표시하는 용도로 사용했다.

ICD-9 code를 함께 사용하면 더 많은 admission을 포함할 수 있지만, ICD-9와 ICD-10 사이에는 crosswalk ambiguity가 생긴다. 이 작업에서는 sample size를 늘리는 것보다 단일 coding system으로 cohort definition을 유지하는 쪽을 선택했다.

## 4. Exclusion Logic

A40/A41 matched admission 중 일부 overlap은 제외했다. 이 제외는 전체 MIMIC-IV에서 특정 code를 가진 환자를 모두 제거하는 방식이 아니라, A40/A41 candidate 안에서 동시에 나타나는 conflict를 정리하는 방식이었다.

제외한 범주는 neonatal sepsis, puerperal sepsis, non-infectious SIRS였다. 이들은 adult hospital sepsis cohort와 population 또는 clinical category가 다르다고 보았다.

| Exclusion family | Reason | Handling |
|---|---|---|
| neonatal sepsis (`P36%`) | adult/hospital sepsis cohort와 다른 population | exclude overlap |
| puerperal sepsis (`O85`) | obstetric sepsis category | exclude overlap |
| non-infectious SIRS (`R65.1%`) | infection-based sepsis와 다른 condition | exclude overlap |

이 단계의 목적은 cohort를 과도하게 좁히는 것이 아니라, event log construction의 시작점으로 사용할 admission set을 일관되게 정리하는 것이었다.

## 5. Cohort Funnel

최종 cohort count는 stage별로 구분해서 해석해야 한다.

| Stage | Count | Meaning |
|---|---:|---|
| A40/A41 matched admissions | 13,480 | ICD-10-CM A40/A41 candidate |
| Excluded overlap | 8 | exclusion code overlap inside candidate cohort |
| Pre-event-log cohort | 13,472 | ICD-10-CM sepsis admissions before event-log validation |
| Baseline event log cohort | 13,471 admissions / 11,081 patients | after removing one logically invalid admission |

`13,472`는 ICD-10-CM cohort를 만든 직후의 admission count다. 이후 event log construction 과정에서 `admittime > TRUE_END`인 admission 1건을 제외했고, 실제 baseline event log와 연결되는 cohort는 `13,471 admissions / 11,081 patients`가 되었다.

따라서 `13,472`와 `13,471`은 서로 다른 결과가 아니라 stage 차이를 나타낸다. GitHub repository의 headline count에는 baseline event log artifact와 직접 연결되는 `13,471 admissions / 11,081 patients`를 사용했다.

## 6. Severity Subgroup

Final ICD-10-CM cohort 안에서 `R65.2x` code를 가진 admission은 severe sepsis / septic shock subgroup으로 표시했다.

| Group | Count |
|---|---:|
| Final ICD-10-CM sepsis cohort | 13,472 |
| Severe sepsis / septic shock subgroup | 7,336 |
| Non-severe subgroup | 6,136 |

이 subgroup은 descriptive summary나 이후 비교 분석에 사용할 수 있지만, baseline event log construction 자체가 severity split에 의존하지는 않았다. 전체 sepsis admission cohort를 먼저 구성하고, severity는 attribute 또는 subgroup으로 해석하는 구조로 두었다.

## 7. Cohort Definition의 해석 범위

이 cohort는 새로운 clinical sepsis diagnosis algorithm이 아니다. Sepsis-3 onset cohort도 아니며, ICU-only cohort도 아니다. ICD-10-CM diagnosis code를 기반으로 한 admission-level sepsis cohort다.

이 구분은 이후 event log construction과 직접 연결된다.

```text
diagnoses_icd
  -> ICD-10-CM A40/A41 candidate
  -> exclusion overlap removed
  -> pre-event-log sepsis cohort
  -> Master Window validation
  -> baseline event log cohort
```

이 결정에 따라 `diagnoses_icd`는 event source가 아니라 filter/attribute table로 사용했다. Severity code 역시 event가 아니라 subgroup attribute로 남겼다. 이후 event extraction은 이 cohort에 scoped되어 진행됐다.

## 정리

Sepsis-3 기준은 임상적으로 더 직접적인 정의가 될 수 있지만, 이 프로젝트의 범위에서는 SOFA reconstruction과 ICU-centered scope가 별도 과제가 될 가능성이 컸다. 최종 cohort definition은 ICD-10-CM A40/A41 기반 admission-level cohort로 정리했다.

이 cohort는 이후 `hadm_id` case notion, event source selection, Master/Child Window validation의 기준이 되었다. 다음 글에서는 이 admission cohort를 바탕으로 MIMIC-IV EHR table을 event log schema로 변환하는 설계를 정리한다.

## 관련 자료

- GitHub 문서: [docs/01_cohort_definition.md](https://github.com/u-nsiq/clinical-event-log-process-mining/blob/main/docs/01_cohort_definition.md)
- Notebook: [research_notebooks/01_cohort_definition.ipynb](https://github.com/u-nsiq/clinical-event-log-process-mining/blob/main/research_notebooks/01_cohort_definition.ipynb)
- Repository: [clinical-event-log-process-mining](https://github.com/u-nsiq/clinical-event-log-process-mining)
