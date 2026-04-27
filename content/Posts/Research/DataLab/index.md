---
title: DataLab
---

2025년 7월부터 2026년 2월까지 Data Analytics Lab에서 진행한 학부연구생 활동을 정리한 공간입니다.

주요 주제는 MIMIC-IV와 eICU-CRD 같은 공개 ICU EHR dataset을 바탕으로 sepsis admission cohort를 정의하고, process mining에 사용할 수 있는 clinical event log를 구성하는 과정입니다.

초기 연구 맥락은 traditional process mining과 object-centric process mining을 비교하기 위한 event log 기반을 준비하는 것이었습니다. 실제 작업은 그 전 단계인 cohort definition, EHR table selection, event log schema 설계, activity abstraction, validation, multi-dataset extension을 중심으로 진행되었습니다.

## 활동 정보

| 항목 | 내용 |
|---|---|
| 소속 | Data Analytics Lab |
| 기간 | 2025.07 ~ 2026.02 |
| 역할 | 학부연구생 |
| 주제 | MIMIC-IV / eICU-CRD 기반 sepsis clinical event log construction |
| 주요 질문 | EHR table을 process mining에서 해석 가능한 event log로 어떻게 변환할 것인가 |
| 사용 기술 | Python, SQL, BigQuery, Jupyter Notebook |
| 정리 자료 | GitHub documents, research notebooks, `clinical_el_builder` pipeline |
| GitHub | [clinical-event-log-process-mining](https://github.com/u-nsiq/clinical-event-log-process-mining) |

## 글 구성

실제 EHR dataset을 process mining용 event log로 바꾸는 과정에서 어떤 기준과 검증이 필요했는지를 순서대로 정리합니다.

| 순서 | 글 | 내용 |
|---|---|---|
| Part 01 | [[Part 01_Sepsis Cohort Definition과 연구 범위 설정|Sepsis Cohort Definition과 연구 범위 설정]] | sepsis cohort 기준과 연구 범위 설정 |
| Part 02 | [[Part 02_MIMIC-IV EHR Table의 Event Log Schema 설계|MIMIC-IV EHR Table의 Event Log Schema 설계]] | case notion, source table selection, normalized event schema |
| Part 03 | [[Part 03_Admission Window 기반 Baseline Event Log 구축|Admission Window 기반 Baseline Event Log 구축]] | Master Window, Child Window, Strict Filtering, baseline event log |
| Part 04 | [[Part 04_Activity Abstraction과 Analysis View 구성|Activity Abstraction과 Analysis View 구성]] | L0/L1/L2 activity hierarchy와 analysis view 구성 |
| Part 05 | [[Part 05_Clinical Event Log Validation과 해석 한계|Clinical Event Log Validation과 해석 한계]] | event log 품질 점검과 해석상 한계 |
| Part 06 | [[Part 06_eICU-CRD Extension과 Dataset Generalization|eICU-CRD Extension과 Dataset Generalization]] | eICU-CRD 적용과 dataset generalization 검토 |

## 관련 자료

- GitHub repository: [clinical-event-log-process-mining](https://github.com/u-nsiq/clinical-event-log-process-mining)
- GitHub overview: [EVENT_LOG_CONSTRUCTION.md](https://github.com/u-nsiq/clinical-event-log-process-mining/blob/main/EVENT_LOG_CONSTRUCTION.md)
