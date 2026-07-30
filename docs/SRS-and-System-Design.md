# Smart Examination and Evaluation Automation Platform
## Software Requirements Specification (SRS) & System Design Document

**Document Version:** 1.0  
**Date:** June 24, 2026  
**Classification:** Industry-Grade Blueprint  
**Target Scale:** 1M+ concurrent users  
**Prepared For:** Final-year engineering projects, startup MVP, enterprise deployment

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [System Architecture](#4-system-architecture)
5. [Database Design](#5-database-design)
6. [AI & Machine Learning Features](#6-ai--machine-learning-features)
7. [API Design](#7-api-design)
8. [User Interface Design](#8-user-interface-design)
9. [Security Framework](#9-security-framework)
10. [Technology Stack](#10-technology-stack)
11. [Development Roadmap](#11-development-roadmap)
12. [Testing Strategy](#12-testing-strategy)
13. [Deployment Strategy](#13-deployment-strategy)
14. [Future Enhancements](#14-future-enhancements)

---

# 1. Project Overview

## 1.1 Problem Statement

Educational institutions face persistent challenges in examination lifecycle management:

| Challenge | Impact |
|-----------|--------|
| Manual question paper creation | Time-consuming, inconsistent difficulty, limited question pool |
| Paper-based or fragmented digital exams | High logistics cost, delayed results, storage overhead |
| Subjective answer evaluation | Subjective bias, evaluator fatigue, inconsistent grading |
| Cheating and impersonation | Compromised academic integrity |
| Lack of real-time analytics | Delayed intervention for at-risk students |
| Siloed systems | Poor integration between LMS, attendance, and grading |

Institutions need a unified, secure, AI-augmented platform that automates the entire examination pipeline—from question generation to result publication—while maintaining academic integrity and regulatory compliance.

## 1.2 Project Objectives

1. **Automate** end-to-end exam lifecycle (creation → scheduling → conduct → evaluation → results)
2. **Reduce** manual evaluation effort by 70%+ through AI-assisted grading
3. **Ensure** academic integrity via multi-layer proctoring and fraud detection
4. **Deliver** results within 24 hours for objective exams and 72 hours for subjective
5. **Provide** actionable analytics for students, faculty, and administrators
6. **Scale** to 1M+ registered users with 100K+ concurrent exam sessions
7. **Comply** with FERPA, GDPR, and institutional data governance policies

## 1.3 Scope

### In Scope
- Student, faculty, and admin portals
- Question bank and AI question generation
- Online and hybrid exam delivery
- Attendance verification (biometric, QR, geo-fencing)
- Automated objective evaluation and AI subjective evaluation
- Proctoring, anti-cheating, audit trails
- Results, grading, analytics, and report generation
- REST APIs and notification system

### Out of Scope (Phase 1)
- Full LMS replacement (integration via APIs only)
- Physical OMR sheet scanning (Phase 2)
- Blockchain certificates (Future Enhancement)
- Voice-based exams (Future Enhancement)

## 1.4 Target Users

| User Role | Description | Primary Needs |
|-----------|-------------|---------------|
| **Student** | Enrolled learners taking exams | Easy exam access, fair evaluation, timely results |
| **Teacher/Examiner** | Faculty creating and evaluating exams | Question tools, bulk grading, analytics |
| **Proctor** | Monitors live exam sessions | Real-time alerts, session control |
| **Department Head** | Oversees subject-level performance | Comparative analytics, approval workflows |
| **Administrator** | IT and academic admin | User management, system config, audit |
| **Super Admin** | Platform owner / SaaS operator | Multi-tenant management, billing |

## 1.5 Expected Outcomes

- 80% reduction in exam administration overhead
- 90%+ accuracy on objective auto-grading
- 85%+ agreement between AI and human evaluators on subjective answers (Cohen's κ ≥ 0.80)
- 99.9% platform availability during exam windows
- Zero tolerance for impersonation via multi-factor identity verification
- Comprehensive audit trail for accreditation and compliance

## 1.6 Unique Selling Points (USPs)

1. **AI-Native Pipeline** — Question generation, difficulty calibration, and subjective grading in one platform
2. **Integrity-First Design** — Browser lockdown, behavioral biometrics, plagiarism detection, risk scoring
3. **Hybrid-Ready** — Supports fully online, center-based, and open-book exam modes
4. **Explainable AI Grading** — Rubric-aligned scores with justification for every subjective mark
5. **Predictive Analytics** — Early warning for at-risk students and exam fraud patterns
6. **Multi-Tenant SaaS** — Single deployment serving multiple institutions with data isolation
7. **API-First Architecture** — Integrates with existing LMS (Moodle, Canvas, Google Classroom)

---

# 2. Functional Requirements

## 2.1 Student Management

| ID | Requirement | Priority |
|----|-------------|----------|
| SM-01 | Register students individually or via bulk CSV/Excel import | High |
| SM-02 | Maintain student profile (ID, name, email, department, batch, photo) | High |
| SM-03 | Assign students to courses, sections, and academic years | High |
| SM-04 | Track enrollment status (active, suspended, graduated) | High |
| SM-05 | Student self-service portal for profile and document upload | Medium |
| SM-06 | Parent/guardian notification opt-in (K-12) | Low |
| SM-07 | Integration with institutional SIS/ERP via API | Medium |

## 2.2 Faculty/Examiner Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FM-01 | Register faculty with role assignments (teacher, examiner, proctor) | High |
| FM-02 | Assign faculty to subjects and courses | High |
| FM-03 | Define evaluator workload and assignment rules | Medium |
| FM-04 | Faculty dashboard for assigned exams and pending evaluations | High |
| FM-05 | Dual-evaluator workflow for high-stakes subjective exams | Medium |
| FM-06 | Faculty performance metrics (grading consistency, turnaround time) | Medium |

## 2.3 Administrator Dashboard

| ID | Requirement | Priority |
|----|-------------|----------|
| AD-01 | Centralized dashboard with KPIs (active exams, users, system health) | High |
| AD-02 | User CRUD with role-based permissions | High |
| AD-03 | Institution and tenant configuration (branding, policies) | High |
| AD-04 | Exam calendar and resource allocation view | High |
| AD-05 | System-wide audit log viewer with export | High |
| AD-06 | Feature flags and maintenance mode control | Medium |
| AD-07 | License and subscription management (SaaS) | Medium |

## 2.4 Question Bank Management

| ID | Requirement | Priority |
|----|-------------|----------|
| QB-01 | CRUD for questions (MCQ, MSQ, True/False, Fill-in, Short Answer, Essay) | High |
| QB-02 | Tag questions by subject, topic, Bloom's taxonomy, difficulty | High |
| QB-03 | Version control and question approval workflow | High |
| QB-04 | Media attachments (images, diagrams, code snippets, LaTeX) | High |
| QB-05 | Question pool randomization for exam assembly | High |
| QB-06 | Import/export (QTI 2.1, CSV, JSON) | Medium |
| QB-07 | Duplicate detection across question bank | Medium |

## 2.5 AI-Based Question Generation

| ID | Requirement | Priority |
|----|-------------|----------|
| AIQ-01 | Generate questions from syllabus topics and learning objectives | High |
| AIQ-02 | Specify difficulty, question type, and count via natural language prompt | High |
| AIQ-03 | Human-in-the-loop review and approval before publishing | High |
| AIQ-04 | Generate distractors for MCQs with plausibility scoring | High |
| AIQ-05 | Generate model answers and rubrics for subjective questions | High |
| AIQ-06 | Batch generation with deduplication against existing bank | Medium |

## 2.6 Exam Scheduling

| ID | Requirement | Priority |
|----|-------------|----------|
| ES-01 | Create exam sessions with date, time, duration, and timezone | High |
| ES-02 | Assign eligible students and invigilators | High |
| ES-03 | Configure exam rules (open book, calculator, attempts) | High |
| ES-04 | Automated conflict detection (student double-booking) | High |
| ES-05 | Reschedule and cancellation with notification cascade | High |
| ES-06 | Exam window with early entry buffer and late submission grace | Medium |
| ES-07 | Recurring exam templates for standardized assessments | Medium |

## 2.7 Online Examination Module

| ID | Requirement | Priority |
|----|-------------|----------|
| OE-01 | Secure exam launcher with pre-exam system check | High |
| OE-02 | Question navigation (flag, review, section-wise) | High |
| OE-03 | Auto-save answers every 30 seconds | High |
| OE-04 | Timer with warnings at 50%, 25%, 5% remaining | High |
| OE-05 | Offline resilience with sync on reconnect | Medium |
| OE-06 | Accessibility: screen reader, font scaling, high contrast | High |
| OE-07 | Support for code editor (programming exams) | Medium |
| OE-08 | Auto-submit on timeout or connection loss (configurable) | High |

## 2.8 Attendance Verification

| ID | Requirement | Priority |
|----|-------------|----------|
| AV-01 | Pre-exam identity verification (photo + ID document) | High |
| AV-02 | QR code check-in at exam center | High |
| AV-03 | Geo-fencing for location-restricted exams | Medium |
| AV-04 | Facial recognition match against enrolled photo | High |
| AV-05 | Attendance log linked to exam session | High |
| AV-06 | Manual override by proctor with reason code | Medium |

## 2.9 Secure Authentication & Authorization

| ID | Requirement | Priority |
|----|-------------|----------|
| SA-01 | Email/password and SSO (SAML 2.0, OAuth 2.0/OIDC) | High |
| SA-02 | Multi-factor authentication (TOTP, SMS, email) | High |
| SA-03 | Role-based access control (RBAC) with granular permissions | High |
| SA-04 | Session management with idle timeout and concurrent session limits | High |
| SA-05 | Password policies and breach detection (HaveIBeenPwned API) | High |
| SA-06 | API key management for integrations | Medium |

## 2.10 Anti-Cheating & Proctoring

| ID | Requirement | Priority |
|----|-------------|----------|
| AC-01 | Full-screen enforcement and tab-switch detection | High |
| AC-02 | Webcam and microphone monitoring with consent | High |
| AC-03 | AI-based gaze tracking and multiple-face detection | High |
| AC-04 | Copy-paste and screenshot prevention | High |
| AC-05 | IP/device fingerprinting and anomaly detection | High |
| AC-06 | Live proctor dashboard with flag-and-review workflow | High |
| AC-07 | Post-exam forensic report generation | High |
| AC-08 | Randomized question order and option shuffling | High |
| AC-09 | Browser lockdown via secure desktop agent (optional) | Medium |

## 2.11 Automated Objective Evaluation

| ID | Requirement | Priority |
|----|-------------|----------|
| AOE-01 | Instant grading for MCQ, MSQ, True/False | High |
| AOE-02 | Partial marking for MSQ (configurable) | Medium |
| AOE-03 | Fill-in-the-blank with fuzzy matching | High |
| AOE-04 | Numeric answer with tolerance range | High |
| AOE-05 | Negative marking support (configurable) | Medium |
| AOE-06 | Auto-grade programming questions via test cases | Medium |

## 2.12 AI-Based Subjective Answer Evaluation

| ID | Requirement | Priority |
|----|-------------|----------|
| ASE-01 | Rubric-based scoring for short answers and essays | High |
| ASE-02 | Semantic similarity scoring against model answers | High |
| ASE-03 | Keyword and concept coverage analysis | High |
| ASE-04 | Human override with feedback loop for model improvement | High |
| ASE-05 | Dual scoring (AI + human) with discrepancy flagging | Medium |
| ASE-06 | Explainable score breakdown per rubric criterion | High |

## 2.13 Result Generation

| ID | Requirement | Priority |
|----|-------------|----------|
| RG-01 | Publish results individually or in batch | High |
| RG-02 | Configurable result visibility (immediate, scheduled, manual release) | High |
| RG-03 | Detailed scorecard with question-wise breakdown | High |
| RG-04 | Rank list and percentile calculation | Medium |
| RG-05 | Re-evaluation request workflow | Medium |
| RG-06 | Result export (PDF, CSV) | High |

## 2.14 Grade Calculation

| ID | Requirement | Priority |
|----|-------------|----------|
| GC-01 | Configurable grading scales (absolute, relative, curved) | High |
| GC-02 | Weighted aggregation across exams, assignments, attendance | High |
| GC-03 | Grade point calculation (GPA/CGPA) | High |
| GC-04 | Pass/fail determination with configurable thresholds | High |
| GC-05 | Grade moderation workflow for department approval | Medium |

## 2.15 Analytics Dashboard

| ID | Requirement | Priority |
|----|-------------|----------|
| AN-01 | Student performance trends over time | High |
| AN-02 | Question-level analytics (difficulty index, discrimination) | High |
| AN-03 | Class/cohort comparison dashboards | High |
| AN-04 | Exam integrity analytics (flag rates, violation types) | High |
| AN-05 | Evaluator consistency reports | Medium |
| AN-06 | Predictive at-risk student identification | Medium |
| AN-07 | Custom report builder with filters and export | Medium |

## 2.16 Report Generation

| ID | Requirement | Priority |
|----|-------------|----------|
| RP-01 | Pre-built report templates (result sheet, transcript, hall ticket) | High |
| RP-02 | Scheduled report generation and email delivery | Medium |
| RP-03 | Accreditation-ready reports (NAAC, ABET format) | Medium |
| RP-04 | PDF generation with institution branding | High |

## 2.17 Notifications and Alerts

| ID | Requirement | Priority |
|----|-------------|----------|
| NT-01 | Email, SMS, push, and in-app notifications | High |
| NT-02 | Event-driven triggers (exam reminder, result published, flag raised) | High |
| NT-03 | Notification preferences per user | Medium |
| NT-04 | Bulk notification with template management | Medium |
| NT-05 | Escalation alerts for proctoring violations | High |

## 2.18 Audit Logs

| ID | Requirement | Priority |
|----|-------------|----------|
| AL-01 | Immutable log of all CRUD operations | High |
| AL-02 | Authentication events (login, logout, failed attempts) | High |
| AL-03 | Exam events (start, submit, flag, grade change) | High |
| AL-04 | Tamper-evident storage with hash chaining | High |
| AL-05 | Searchable audit UI with retention policies | High |
| AL-06 | Compliance export for external auditors | Medium |

---

# 3. Non-Functional Requirements

## 3.1 Security

| Requirement | Target |
|-------------|--------|
| Data encryption at rest | AES-256 |
| Data encryption in transit | TLS 1.3 |
| Authentication | JWT + MFA + SSO |
| Authorization | RBAC with least privilege |
| Penetration testing | Quarterly third-party assessment |
| Vulnerability scanning | Weekly automated SAST/DAST |
| Secrets management | HashiCorp Vault / AWS Secrets Manager |
| OWASP Top 10 | Full mitigation documented in Section 9 |

## 3.2 Scalability

| Dimension | Target |
|-----------|--------|
| Registered users | 1M+ |
| Concurrent exam sessions | 100K+ |
| Horizontal scaling | Auto-scale pods 10→500 based on load |
| Database | Read replicas + sharding by tenant_id |
| CDN | Global edge caching for static assets |
| Message queue | Kafka for async evaluation and notifications |

## 3.3 Performance

| Metric | Target |
|--------|--------|
| API response time (p95) | < 200ms (non-AI endpoints) |
| AI grading latency | < 5s per short answer |
| Page load time (LCP) | < 2.5s |
| Exam auto-save | < 500ms |
| Result generation (10K students) | < 5 minutes |
| Search question bank (1M questions) | < 1s |

## 3.4 Reliability

| Metric | Target |
|--------|--------|
| Uptime SLA | 99.9% (exam windows: 99.99%) |
| RPO (Recovery Point Objective) | ≤ 5 minutes |
| RTO (Recovery Time Objective) | ≤ 30 minutes |
| Data backup | Hourly incremental, daily full |
| Chaos engineering | Monthly failure injection tests |

## 3.5 Availability

- Multi-AZ deployment across 3 availability zones
- Active-active load balancing
- Circuit breakers and graceful degradation during AI service outage
- Read-only mode fallback for result viewing during maintenance

## 3.6 Accessibility

- WCAG 2.1 Level AA compliance
- Keyboard navigation, screen reader support
- Adjustable fonts, contrast themes
- Extended time accommodations for students with disabilities

## 3.7 Compliance

| Standard | Applicability |
|----------|---------------|
| GDPR | EU student data |
| FERPA | US educational records |
| ISO 27001 | Information security management |
| SOC 2 Type II | SaaS trust criteria |
| IT Act 2000 / DPDP Act 2023 | India data protection |

## 3.8 Data Privacy

- Data minimization and purpose limitation
- Right to erasure (with legal retention exceptions)
- Consent management for biometric and proctoring data
- Tenant data isolation (schema-per-tenant or row-level security)
- PII masking in logs and analytics
- Data residency options (region-specific storage)

---

# 4. System Architecture

## 4.1 High-Level Architecture Diagram Description

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Student Web  │  │ Teacher Web  │  │ Admin Portal │  │ Proctor App  │    │
│  │   (React)    │  │   (React)    │  │   (React)    │  │  (React/PWA) │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼─────────────────┼─────────────────┼─────────────────┼────────────┘
          │                 │                 │                 │
          └─────────────────┴────────┬────────┴─────────────────┘
                                     │ HTTPS / WSS
┌────────────────────────────────────┼────────────────────────────────────────┐
│                         EDGE LAYER                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                     │
│  │ CloudFront   │  │ WAF + DDoS   │  │ API Gateway  │                     │
│  │ CDN          │  │ Shield       │  │ (Kong/AWS)   │                     │
│  └──────────────┘  └──────────────┘  └──────┬───────┘                     │
└───────────────────────────────────────────────┼─────────────────────────────┘
                                                │
┌───────────────────────────────────────────────┼─────────────────────────────┐
│                    MICROSERVICES LAYER (Kubernetes)                        │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐             │
│  │ Auth       │ │ User       │ │ Question   │ │ Exam       │             │
│  │ Service    │ │ Service    │ │ Service    │ │ Service    │             │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐             │
│  │ Evaluation │ │ Proctoring │ │ Analytics  │ │ Notification│            │
│  │ Service    │ │ Service    │ │ Service    │ │ Service    │             │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                             │
│  │ AI/ML      │ │ Report     │ │ Audit      │                             │
│  │ Service    │ │ Service    │ │ Service    │                             │
│  └────────────┘ └────────────┘ └────────────┘                             │
└───────────────────────────────────────────────┼─────────────────────────────┘
                                                │
┌───────────────────────────────────────────────┼─────────────────────────────┐
│                         DATA & MESSAGING LAYER                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐             │
│  │ PostgreSQL │ │ Redis      │ │ Elasticsearch│ │ Kafka     │             │
│  │ (Primary)  │ │ (Cache)    │ │ (Search/Logs)│ │ (Events)  │             │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                             │
│  │ S3/MinIO   │ │ MLflow     │ │ Vector DB  │                             │
│  │ (Files)    │ │ (Models)   │ │ (Pinecone) │                             │
│  └────────────┘ └────────────┘ └────────────┘                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 4.2 Microservices Architecture

| Service | Responsibility | Tech | Database |
|---------|---------------|------|----------|
| **auth-service** | Login, JWT, MFA, SSO | Node.js/NestJS | Redis (sessions) |
| **user-service** | Students, teachers, profiles | Node.js/NestJS | PostgreSQL |
| **question-service** | Question bank CRUD, import/export | Node.js/NestJS | PostgreSQL + ES |
| **exam-service** | Scheduling, sessions, delivery | Node.js/NestJS | PostgreSQL + Redis |
| **evaluation-service** | Objective grading, result calc | Python/FastAPI | PostgreSQL |
| **ai-service** | Question gen, subjective grading, ML inference | Python/FastAPI | Vector DB + MLflow |
| **proctoring-service** | Webcam analysis, flags, risk score | Python/FastAPI | PostgreSQL + S3 |
| **analytics-service** | Dashboards, reports, predictions | Python/FastAPI | PostgreSQL + ClickHouse |
| **notification-service** | Email, SMS, push | Node.js/NestJS | PostgreSQL + Redis |
| **audit-service** | Immutable audit logs | Go | PostgreSQL + S3 |
| **report-service** | PDF generation, templates | Node.js/NestJS | PostgreSQL + S3 |

**Inter-service communication:** REST (sync) + Kafka (async events)  
**Service discovery:** Kubernetes DNS + Consul (optional)  
**API Gateway:** Kong / AWS API Gateway with rate limiting and auth

## 4.3 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Exam Service                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Scheduler   │  │ Session     │  │ Delivery    │     │
│  │ Module      │──│ Manager     │──│ Engine      │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│         │                │                │              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Rules       │  │ Timer       │  │ Auto-Save   │     │
│  │ Engine      │  │ Service     │  │ Handler     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   Question Service    Proctoring Service    Evaluation Service
```

## 4.4 Data Flow Diagram (DFD) — Level 1

```
[Student] ──register──▶ [User Service] ──store──▶ [PostgreSQL]
[Teacher] ──create Q──▶ [Question Service] ──▶ [Question Bank DB]
[Teacher] ──create exam──▶ [Exam Service] ──pull questions──▶ [Question Service]
[Student] ──start exam──▶ [Exam Service] ──verify──▶ [Auth + Proctoring]
[Student] ──submit answers──▶ [Exam Service] ──event──▶ [Kafka]
[Kafka] ──▶ [Evaluation Service] ──objective grade──▶ [Results DB]
[Kafka] ──▶ [AI Service] ──subjective grade──▶ [Results DB]
[Evaluation Service] ──publish──▶ [Notification Service] ──▶ [Student Email/SMS]
[Admin] ──view analytics──▶ [Analytics Service] ◀── [Results DB + Audit Logs]
```

## 4.5 Sequence Diagrams

### 4.5.1 Student Exam Flow

```
Student          Exam UI         API Gateway      Exam Service      Proctoring      Evaluation
   │                │                 │                │                │                │
   │──Login────────▶│                 │                │                │                │
   │                │──POST /auth────▶│──forward──────▶│                │                │
   │                │◀──JWT───────────│◀───────────────│                │                │
   │──Start Exam───▶│                 │                │                │                │
   │                │──POST /exams/:id/start──────────▶│                │                │
   │                │                 │                │──verify identity──────────────▶│
   │                │                 │                │◀──OK───────────────────────────│
   │                │◀──exam payload──│◀───────────────│                │                │
   │◀──Questions────│                 │                │                │                │
   │──Answer autosave────────────────▶│───────────────▶│                │                │
   │                │                 │                │──webcam stream─▶│                │
   │──Submit───────▶│──POST /submit──▶│───────────────▶│                │                │
   │                │                 │                │──exam.submitted event──────────▶│
   │                │                 │                │                │──grade────────▶│
   │◀──Result───────│◀──GET /results──│◀───────────────│◀───────────────│◀───────────────│
```

### 4.5.2 AI Subjective Evaluation Flow

```
Evaluation Svc    Kafka         AI Service       Vector DB      MLflow        PostgreSQL
      │              │               │               │              │              │
      │──publish────▶│               │               │              │              │
      │  subjective  │──consume─────▶│               │              │              │
      │  grading job │               │──embed answer─▶│              │              │
      │              │               │──load model──────────────────▶│              │
      │              │               │──score + rubric breakdown─────│─────────────▶│
      │              │               │◀──store evaluation──────────│──────────────│
      │◀──completed──│◀──event───────│               │              │              │
```

## 4.6 Deployment Architecture

```
                    ┌─────────────────────────────────┐
                    │         Route 53 / DNS          │
                    └───────────────┬─────────────────┘
                                    │
                    ┌───────────────▼─────────────────┐
                    │    CloudFront CDN (Global)      │
                    └───────────────┬─────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
    ┌─────▼─────┐             ┌─────▼─────┐             ┌─────▼─────┐
    │  AZ-1     │             │  AZ-2     │             │  AZ-3     │
    │ EKS Cluster│             │ EKS Cluster│             │ EKS Cluster│
    │ ┌───────┐ │             │ ┌───────┐ │             │ ┌───────┐ │
    │ │ Pods  │ │             │ │ Pods  │ │             │ │ Pods  │ │
    │ └───────┘ │             │ └───────┘ │             │ └───────┘ │
    │ RDS Primary│             │ RDS Replica│            │ RDS Replica│
    └───────────┘             └───────────┘             └───────────┘
```

## 4.7 Cloud Architecture (AWS Reference)

| Component | AWS Service | Purpose |
|-----------|-------------|---------|
| Compute | EKS (Kubernetes) | Microservices hosting |
| Database | RDS PostgreSQL Multi-AZ | Primary relational store |
| Cache | ElastiCache Redis | Sessions, exam state |
| Search | OpenSearch | Question bank full-text search |
| Storage | S3 | Media, proctoring recordings |
| CDN | CloudFront | Static assets, edge caching |
| Queue | MSK (Kafka) | Event streaming |
| AI Inference | SageMaker / GPU EC2 | ML model serving |
| Secrets | Secrets Manager | Credentials |
| Monitoring | CloudWatch + Grafana | Metrics and alerts |
| WAF | AWS WAF | Application firewall |

---

# 5. Database Design

## 5.1 ER Diagram Description

**Core Entities and Relationships:**

- **users** (1) ── (1) **students** | **teachers** (disjoint subtype via role)
- **users** (N) ── (M) **roles** via **user_roles**
- **roles** (N) ── (M) **permissions** via **role_permissions**
- **courses** (1) ── (N) **subjects**
- **subjects** (1) ── (N) **questions**
- **exams** (N) ── (M) **questions** via **exam_questions**
- **exams** (N) ── (M) **students** via **exam_enrollments**
- **exam_sessions** (1) ── (N) **answers**
- **answers** (1) ── (1) **evaluations**
- **exam_sessions** (1) ── (1) **results**
- **users** (1) ── (N) **notifications**
- **users** (1) ── (N) **audit_logs**

## 5.2 Normalized Database Schema (3NF)

All tables include: `id (UUID PK)`, `tenant_id (UUID FK)`, `created_at`, `updated_at`, `deleted_at (soft delete)`.

### 5.2.1 users

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | FK → tenants, NOT NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| phone | VARCHAR(20) | |
| avatar_url | TEXT | |
| is_active | BOOLEAN | DEFAULT true |
| email_verified_at | TIMESTAMP | |
| last_login_at | TIMESTAMP | |
| mfa_enabled | BOOLEAN | DEFAULT false |
| mfa_secret | VARCHAR(255) | encrypted |

**Indexes:** `idx_users_tenant_email (tenant_id, email)`, `idx_users_tenant_active`

### 5.2.2 roles

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | FK (NULL for system roles) |
| name | VARCHAR(50) | NOT NULL (student, teacher, proctor, admin, super_admin) |
| description | TEXT | |
| is_system | BOOLEAN | DEFAULT false |

### 5.2.3 user_roles

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| role_id | UUID | FK → roles |
| assigned_at | TIMESTAMP | DEFAULT NOW() |

**Unique:** `(user_id, role_id)`

### 5.2.4 students

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users, UNIQUE |
| student_id | VARCHAR(50) | NOT NULL (roll number) |
| department | VARCHAR(100) | |
| batch | VARCHAR(20) | |
| semester | INT | |
| enrollment_date | DATE | |
| status | ENUM | active, suspended, graduated |

**Indexes:** `idx_students_tenant_student_id (tenant_id, student_id)`

### 5.2.5 teachers

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users, UNIQUE |
| employee_id | VARCHAR(50) | NOT NULL |
| department | VARCHAR(100) | |
| designation | VARCHAR(100) | |
| specialization | TEXT | |

### 5.2.6 courses

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | FK |
| code | VARCHAR(20) | NOT NULL |
| name | VARCHAR(200) | NOT NULL |
| description | TEXT | |
| credits | DECIMAL(3,1) | |
| academic_year | VARCHAR(10) | |

### 5.2.7 subjects

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| course_id | UUID | FK → courses |
| code | VARCHAR(20) | NOT NULL |
| name | VARCHAR(200) | NOT NULL |
| syllabus | TEXT | |

### 5.2.8 exams

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | FK |
| subject_id | UUID | FK → subjects |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | |
| exam_type | ENUM | objective, subjective, mixed, programming |
| duration_minutes | INT | NOT NULL |
| total_marks | DECIMAL(7,2) | NOT NULL |
| passing_marks | DECIMAL(7,2) | |
| start_time | TIMESTAMP | NOT NULL |
| end_time | TIMESTAMP | NOT NULL |
| status | ENUM | draft, scheduled, active, completed, cancelled |
| rules_json | JSONB | exam configuration |
| created_by | UUID | FK → users |

**Indexes:** `idx_exams_tenant_status`, `idx_exams_start_time`

### 5.2.9 questions

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | FK |
| subject_id | UUID | FK → subjects |
| question_type | ENUM | mcq, msq, true_false, fill_blank, short_answer, essay, code |
| question_text | TEXT | NOT NULL |
| options_json | JSONB | for MCQ/MSQ |
| correct_answer | TEXT | |
| model_answer | TEXT | for subjective |
| rubric_json | JSONB | scoring criteria |
| difficulty | ENUM | easy, medium, hard |
| bloom_level | VARCHAR(20) | |
| marks | DECIMAL(5,2) | NOT NULL |
| tags | TEXT[] | |
| media_urls | TEXT[] | |
| is_ai_generated | BOOLEAN | DEFAULT false |
| status | ENUM | draft, approved, archived |
| created_by | UUID | FK → users |

**Indexes:** `idx_questions_subject`, `idx_questions_tags (GIN)`, full-text on `question_text`

### 5.2.10 exam_questions

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| exam_id | UUID | FK → exams |
| question_id | UUID | FK → questions |
| sequence_order | INT | |
| marks_override | DECIMAL(5,2) | |

### 5.2.11 exam_enrollments

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| exam_id | UUID | FK → exams |
| student_id | UUID | FK → students |
| status | ENUM | enrolled, attended, absent, submitted |
| enrolled_at | TIMESTAMP | |

**Unique:** `(exam_id, student_id)`

### 5.2.12 exam_sessions

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| exam_id | UUID | FK → exams |
| student_id | UUID | FK → students |
| started_at | TIMESTAMP | |
| submitted_at | TIMESTAMP | |
| time_remaining_seconds | INT | |
| ip_address | INET | |
| device_fingerprint | VARCHAR(255) | |
| proctoring_score | DECIMAL(5,2) | |
| status | ENUM | in_progress, submitted, timed_out, flagged |
| flag_count | INT | DEFAULT 0 |

**Indexes:** `idx_sessions_exam_student (exam_id, student_id)`

### 5.2.13 answers

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| session_id | UUID | FK → exam_sessions |
| question_id | UUID | FK → questions |
| answer_text | TEXT | |
| selected_options | JSONB | |
| code_submission | TEXT | |
| attachment_url | TEXT | |
| answered_at | TIMESTAMP | |
| is_flagged_for_review | BOOLEAN | DEFAULT false |

**Unique:** `(session_id, question_id)`

### 5.2.14 evaluations

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| answer_id | UUID | FK → answers, UNIQUE |
| marks_awarded | DECIMAL(5,2) | |
| max_marks | DECIMAL(5,2) | |
| evaluation_type | ENUM | auto, ai, manual, hybrid |
| ai_score | DECIMAL(5,2) | |
| ai_confidence | DECIMAL(5,4) | |
| ai_feedback | TEXT | |
| rubric_scores_json | JSONB | |
| evaluated_by | UUID | FK → users (NULL for auto) |
| evaluated_at | TIMESTAMP | |
| is_final | BOOLEAN | DEFAULT false |

### 5.2.15 results

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| session_id | UUID | FK → exam_sessions, UNIQUE |
| exam_id | UUID | FK → exams |
| student_id | UUID | FK → students |
| total_marks | DECIMAL(7,2) | |
| marks_obtained | DECIMAL(7,2) | |
| percentage | DECIMAL(5,2) | |
| grade | VARCHAR(5) | |
| rank | INT | |
| percentile | DECIMAL(5,2) | |
| pass_status | BOOLEAN | |
| published_at | TIMESTAMP | |
| result_json | JSONB | detailed breakdown |

**Indexes:** `idx_results_exam_student`, `idx_results_published`

### 5.2.16 notifications

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | FK |
| user_id | UUID | FK → users |
| type | VARCHAR(50) | |
| title | VARCHAR(255) | |
| message | TEXT | |
| channel | ENUM | email, sms, push, in_app |
| status | ENUM | pending, sent, failed, read |
| metadata_json | JSONB | |
| sent_at | TIMESTAMP | |
| read_at | TIMESTAMP | |

**Indexes:** `idx_notifications_user_status`

### 5.2.17 audit_logs

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | FK |
| user_id | UUID | FK → users (NULL for system) |
| action | VARCHAR(100) | NOT NULL |
| entity_type | VARCHAR(50) | |
| entity_id | UUID | |
| old_values | JSONB | |
| new_values | JSONB | |
| ip_address | INET | |
| user_agent | TEXT | |
| hash_chain | VARCHAR(64) | tamper-evident |
| created_at | TIMESTAMP | NOT NULL |

**Indexes:** `idx_audit_tenant_created`, `idx_audit_entity`, partition by month

## 5.3 Indexing Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| users | (tenant_id, email) UNIQUE | Login lookup |
| questions | GIN(tags), GIN(to_tsvector(question_text)) | Search |
| exam_sessions | (exam_id, status) | Active session queries |
| results | (exam_id, marks_obtained DESC) | Rank generation |
| audit_logs | (tenant_id, created_at) BRIN | Time-range scans |
| All tables | tenant_id | Multi-tenant isolation |

**Sharding strategy:** Shard by `tenant_id` for tables exceeding 100M rows. Use Citus or application-level routing.

---

# 6. AI & Machine Learning Features

## 6.1 Question Generation using NLP

| Aspect | Detail |
|--------|--------|
| **Algorithm** | Fine-tuned LLM (Llama 3 / GPT-4) + RAG over syllabus documents |
| **Model** | Transformer decoder with retrieval-augmented generation |
| **Training** | Fine-tune on 50K+ curated Q&A pairs from educational datasets (SciQ, SQuAD edu) |
| **Dataset** | Institution syllabus PDFs, past papers, open educational resources |
| **Metrics** | BLEU-4 ≥ 0.35, human expert approval rate ≥ 80%, duplicate rate < 5% |
| **Pipeline** | Prompt → Generate → Validate format → Deduplicate (embedding similarity) → Human review |

## 6.2 Difficulty Level Prediction

| Aspect | Detail |
|--------|--------|
| **Algorithm** | Gradient Boosting (XGBoost) + feature engineering |
| **Features** | Word count, Bloom's level, readability (Flesch-Kincaid), concept count, option similarity |
| **Training** | Historical exam data with actual difficulty index (p-value) |
| **Metrics** | MAE < 0.15 on 0-1 difficulty scale, R² > 0.75 |

## 6.3 Automatic Subjective Answer Evaluation

| Aspect | Detail |
|--------|--------|
| **Algorithm** | Hybrid: Sentence-BERT embeddings + Cross-encoder reranking + LLM rubric scoring |
| **Model** | `all-MiniLM-L6-v2` for embedding; fine-tuned `deberta-v3-base` for scoring |
| **Training** | 100K+ graded student answers with expert scores and rubrics |
| **Process** | Embed student answer → Compare with model answer & rubric criteria → Generate per-criterion scores → Aggregate weighted score |
| **Metrics** | Pearson r ≥ 0.85 vs human graders, Quadratic Weighted Kappa ≥ 0.80 |

## 6.4 Similarity Detection

| Aspect | Detail |
|--------|--------|
| **Algorithm** | Cosine similarity on sentence embeddings (SBERT) |
| **Threshold** | > 0.92 flag as near-duplicate answer among peers |
| **Use case** | Detect copy answers within same exam session |

## 6.5 Plagiarism Detection

| Aspect | Detail |
|--------|--------|
| **Algorithm** | Winnowing fingerprinting + embedding similarity + external corpus check |
| **Sources** | Web index (optional), internal submission history, question bank |
| **Metrics** | Precision ≥ 0.90, Recall ≥ 0.85 on benchmark corpus |

## 6.6 Student Performance Prediction

| Aspect | Detail |
|--------|--------|
| **Algorithm** | LSTM / Temporal Fusion Transformer on time-series performance data |
| **Features** | Past exam scores, attendance, assignment grades, time-on-task |
| **Output** | Pass probability, predicted grade band, at-risk flag |
| **Metrics** | AUC-ROC ≥ 0.85 for at-risk classification |

## 6.7 Personalized Learning Recommendations

| Aspect | Detail |
|--------|--------|
| **Algorithm** | Collaborative filtering + knowledge graph (subject → topic → resource) |
| **Output** | Recommended study topics, practice questions, external resources |
| **Metrics** | Click-through rate, post-recommendation score improvement |

## 6.8 Exam Risk Analysis

| Aspect | Detail |
|--------|--------|
| **Algorithm** | Anomaly detection (Isolation Forest) on proctoring features |
| **Features** | Tab switches, gaze deviation, audio anomalies, answer time patterns, IP changes |
| **Output** | Risk score 0-100 per session |
| **Metrics** | Fraud detection recall ≥ 0.90 at 5% false positive rate |

## 6.9 Fraud Detection

| Aspect | Detail |
|--------|--------|
| **Algorithm** | Ensemble: Random Forest + Graph Neural Network (collusion detection) |
| **Signals** | Identical wrong answers, synchronized submissions, device sharing |
| **Metrics** | F1 ≥ 0.88 on labeled fraud dataset |

---

# 7. API Design

**Base URL:** `https://api.examplatform.com/v1`  
**Auth Header:** `Authorization: Bearer <JWT>`  
**Content-Type:** `application/json`

## 7.1 Authentication APIs

### POST /auth/register
**Request:**
```json
{
  "email": "student@university.edu",
  "password": "SecureP@ss123",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student"
}
```
**Response (201):**
```json
{
  "user_id": "uuid",
  "email": "student@university.edu",
  "message": "Verification email sent"
}
```
**Status Codes:** 201, 400, 409, 422

### POST /auth/login
**Request:**
```json
{
  "email": "student@university.edu",
  "password": "SecureP@ss123",
  "mfa_code": "123456"
}
```
**Response (200):**
```json
{
  "access_token": "eyJhbG...",
  "refresh_token": "eyJhbG...",
  "expires_in": 3600,
  "user": { "id": "uuid", "roles": ["student"] }
}
```
**Status Codes:** 200, 401, 403 (MFA required), 429

### POST /auth/refresh
**Request:** `{ "refresh_token": "..." }`  
**Response (200):** New access_token  
**Status Codes:** 200, 401

### POST /auth/logout
**Status Codes:** 204, 401

## 7.2 User Management APIs

### GET /users
**Query:** `?role=student&page=1&limit=20&search=john`  
**Response (200):**
```json
{
  "data": [{ "id": "uuid", "email": "...", "first_name": "...", "roles": ["student"] }],
  "pagination": { "page": 1, "limit": 20, "total": 1500 }
}
```

### GET /users/:id
**Response (200):** User object with profile  
**Status Codes:** 200, 404, 403

### PUT /users/:id
**Request:** Partial user update  
**Status Codes:** 200, 400, 403, 404

### DELETE /users/:id
**Status Codes:** 204, 403, 404

### POST /users/bulk-import
**Request:** multipart/form-data CSV file  
**Response (202):** `{ "job_id": "uuid", "status": "processing" }`

## 7.3 Question Management APIs

### POST /questions
**Request:**
```json
{
  "subject_id": "uuid",
  "question_type": "mcq",
  "question_text": "What is the time complexity of binary search?",
  "options_json": [
    { "id": "a", "text": "O(n)" },
    { "id": "b", "text": "O(log n)" },
    { "id": "c", "text": "O(n²)" }
  ],
  "correct_answer": "b",
  "difficulty": "medium",
  "marks": 2,
  "tags": ["algorithms", "complexity"]
}
```
**Response (201):** Created question object  
**Status Codes:** 201, 400, 403, 422

### GET /questions
**Query:** `?subject_id=uuid&type=mcq&difficulty=hard&page=1`  
**Response (200):** Paginated question list

### POST /questions/generate
**Request:**
```json
{
  "subject_id": "uuid",
  "topic": "Sorting Algorithms",
  "question_type": "mcq",
  "difficulty": "medium",
  "count": 10,
  "bloom_level": "apply"
}
```
**Response (202):** `{ "job_id": "uuid", "status": "generating" }`

### PUT /questions/:id/approve
**Status Codes:** 200, 403, 404

## 7.4 Exam Management APIs

### POST /exams
**Request:**
```json
{
  "subject_id": "uuid",
  "title": "Mid-Term Examination",
  "exam_type": "mixed",
  "duration_minutes": 120,
  "total_marks": 100,
  "start_time": "2026-07-15T09:00:00Z",
  "end_time": "2026-07-15T11:00:00Z",
  "question_ids": ["uuid1", "uuid2"],
  "rules_json": {
    "shuffle_questions": true,
    "proctoring_enabled": true,
    "negative_marking": 0.25
  }
}
```
**Response (201):** Exam object  
**Status Codes:** 201, 400, 403

### GET /exams/:id
**Response (200):** Exam details (questions hidden for students until start)

### POST /exams/:id/enroll
**Request:** `{ "student_ids": ["uuid1", "uuid2"] }`  
**Status Codes:** 200, 403

### POST /exams/:id/start
**Response (200):**
```json
{
  "session_id": "uuid",
  "questions": [...],
  "duration_seconds": 7200,
  "server_time": "2026-07-15T09:00:05Z"
}
```
**Status Codes:** 200, 403, 409 (already submitted)

### PUT /exams/sessions/:sessionId/answers
**Request:**
```json
{
  "question_id": "uuid",
  "answer_text": "O(log n)",
  "selected_options": ["b"]
}
```
**Response (200):** `{ "saved_at": "timestamp" }`  
**Status Codes:** 200, 400, 409

### POST /exams/sessions/:sessionId/submit
**Response (200):** `{ "submitted_at": "timestamp", "evaluation_job_id": "uuid" }`

## 7.5 Evaluation APIs

### POST /evaluations/trigger
**Request:** `{ "session_id": "uuid" }`  
**Response (202):** Evaluation job queued

### GET /evaluations/session/:sessionId
**Response (200):**
```json
{
  "session_id": "uuid",
  "evaluations": [
    {
      "question_id": "uuid",
      "marks_awarded": 1.5,
      "max_marks": 2,
      "evaluation_type": "ai",
      "feedback": "Correct concept but missing edge case explanation"
    }
  ],
  "status": "completed"
}
```

### PUT /evaluations/:id/override
**Request:** `{ "marks_awarded": 2, "reason": "Manual review - full credit warranted" }`  
**Status Codes:** 200, 403

## 7.6 Results APIs

### GET /results/exam/:examId
**Query:** `?student_id=uuid`  
**Response (200):** Result object with breakdown

### POST /results/exam/:examId/publish
**Request:** `{ "publish_at": "2026-07-16T10:00:00Z" }`  
**Status Codes:** 200, 403

### GET /results/exam/:examId/ranklist
**Response (200):** Ordered rank list with percentiles

### GET /results/:id/transcript
**Response (200):** PDF download URL

## 7.7 Analytics APIs

### GET /analytics/dashboard
**Query:** `?role=admin&period=30d`  
**Response (200):**
```json
{
  "total_exams": 45,
  "active_students": 12500,
  "avg_score": 72.5,
  "integrity_flags": 23,
  "at_risk_students": 156
}
```

### GET /analytics/exam/:examId/item-analysis
**Response (200):** Per-question difficulty and discrimination indices

### GET /analytics/student/:studentId/performance
**Response (200):** Time-series performance data

### GET /analytics/predictions/at-risk
**Response (200):** List of at-risk students with probability scores

---

# 8. User Interface Design

## 8.1 Student Portal

### Dashboard Layout
```
┌────────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard | My Exams | Results | Profile    [🔔][👤]│
├────────────────────────────────────────────────────────────┤
│  Welcome, John Doe                    Next Exam: 2 days   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Upcoming     │ │ Recent       │ │ Performance  │        │
│  │ Exams (3)    │ │ Results (5)  │ │ Chart        │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Exam Calendar (month view)                          │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### Navigation Flow
Login → MFA → Dashboard → Exam List → Pre-Exam Check (camera/mic) → Exam Interface → Submit Confirmation → Results

### Key Screens
1. **Exam Taking Interface** — Left: question palette; Center: question + answer area; Top: timer + progress; Right: flag for review
2. **Results Detail** — Score summary, question-wise breakdown, AI feedback
3. **Profile** — Personal info, notification preferences, accommodation settings

## 8.2 Teacher Portal

### Dashboard Layout
```
┌────────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard | Questions | Exams | Evaluate | Analytics│
├────────────────────────────────────────────────────────────┤
│  Pending Evaluations: 12    Draft Exams: 3                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Quick Create│ │ AI Question │ │ Grade Queue │          │
│  │ Exam        │ │ Generator   │ │             │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Class Performance Heatmap                           │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### Navigation Flow
Login → Dashboard → Question Bank (create/import/AI generate) → Exam Builder → Schedule → Monitor Live Exams → Evaluation Queue → Publish Results

## 8.3 Admin Dashboard

### Dashboard Layout
```
┌────────────────────────────────────────────────────────────┐
│ [Logo]  Overview | Users | Exams | System | Audit | Reports│
├──────────┬─────────────────────────────────────────────────┤
│ Sidebar  │  System Health: ● Healthy   Active Users: 2,340  │
│ - Users  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│ - Roles  │  │Users │ │Exams │ │Flags │ │Uptime│            │
│ - Config │  │12.5K │ │  45  │ │  23  │ │99.9% │            │
│ - Audit  │  └──────┘ └──────┘ └──────┘ └──────┘            │
│ - Reports│  ┌─────────────────────────────────────────┐    │
│          │  │ Tenant Usage & Resource Graph            │    │
│          │  └─────────────────────────────────────────┘    │
└──────────┴─────────────────────────────────────────────────┘
```

## 8.4 Responsive Design Strategy

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥1280px) | Full sidebar + multi-column dashboard |
| Tablet (768-1279px) | Collapsible sidebar, 2-column grid |
| Mobile (<768px) | Bottom navigation, single column, exam UI optimized for touch |

**Exam mobile considerations:** Large tap targets, swipe navigation between questions, persistent timer bar, offline indicator.

**Design system:** Tailwind CSS + shadcn/ui components, institution theming via CSS variables.

---

# 9. Security Framework

## 9.1 JWT Authentication

- **Access token:** 15-minute expiry, RS256 signed
- **Refresh token:** 7-day expiry, stored in HttpOnly Secure cookie
- **Claims:** `sub`, `tenant_id`, `roles[]`, `permissions[]`, `iat`, `exp`
- **Rotation:** Refresh token rotation on each use; reuse detection triggers session revocation

## 9.2 RBAC

| Role | Permissions |
|------|-------------|
| student | exam:take, result:view:self, profile:edit:self |
| teacher | question:*, exam:create, exam:manage:own, evaluate:*, analytics:view:class |
| proctor | exam:monitor, session:flag, attendance:verify |
| admin | user:*, exam:*, system:config, audit:view |
| super_admin | tenant:*, all permissions |

Implementation: Policy engine (Casbin) with resource-level checks.

## 9.3 Encryption

| Layer | Method |
|-------|--------|
| Transit | TLS 1.3, HSTS, certificate pinning (mobile) |
| At rest | AES-256-GCM (RDS, S3 SSE-KMS) |
| Application | bcrypt (passwords, cost 12), AES-256-GCM (MFA secrets) |
| Field-level | Encrypt PII columns (phone, biometric templates) |

## 9.4 Secure File Storage

- S3 with bucket policies, pre-signed URLs (15-min expiry)
- Virus scanning on upload (ClamAV)
- Separate buckets per tenant with IAM isolation
- Proctoring recordings encrypted, auto-deleted per retention policy

## 9.5 Multi-Factor Authentication

- TOTP (Google Authenticator compatible)
- SMS/Email OTP (fallback)
- WebAuthn/FIDO2 (recommended for admins)
- Mandatory MFA for admin and proctor roles

## 9.6 Session Management

- Redis-backed session store
- Max 3 concurrent sessions per user
- Idle timeout: 30 minutes (configurable)
- Absolute timeout: 8 hours
- Force logout on password change

## 9.7 Audit Trails

- Append-only audit_logs table with hash chaining
- Log all authentication, authorization failures, data mutations
- 7-year retention for compliance
- Real-time streaming to SIEM (Splunk/Datadog)

## 9.8 OWASP Best Practices

| Risk | Mitigation |
|------|------------|
| Injection | Parameterized queries, ORM, input validation (Zod/Joi) |
| Broken Auth | MFA, rate limiting, account lockout |
| XSS | CSP headers, output encoding, React auto-escaping |
| CSRF | SameSite cookies, CSRF tokens for state-changing ops |
| SSRF | Allowlist outbound URLs |
| Security Misconfiguration | Infrastructure as Code, automated scanning |
| Insecure Deserialization | JSON only, schema validation |
| Insufficient Logging | Centralized logging, alerting on anomalies |

## 9.9 Anti-Cheating Mechanisms

1. Browser extension detection and lockdown mode
2. WebRTC stream analysis (face count, gaze, environment)
3. Keystroke dynamics fingerprinting
4. Question and option randomization
5. Honeypot questions (hidden from UI, detect automation)
6. IP geolocation anomaly alerts
7. Post-exam forensic timeline reconstruction

---

# 10. Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Frontend** | React 18 + TypeScript + Vite | Component reusability, strong ecosystem, type safety |
| **UI Framework** | Tailwind CSS + shadcn/ui | Rapid development, accessible components, theming |
| **State Management** | TanStack Query + Zustand | Server state caching, minimal client state |
| **Backend (API)** | NestJS (Node.js) | Modular architecture, DI, TypeScript, enterprise patterns |
| **Backend (AI)** | FastAPI (Python) | ML ecosystem, async performance, OpenAPI auto-docs |
| **API Gateway** | Kong / AWS API Gateway | Rate limiting, auth, routing, plugin ecosystem |
| **Primary DB** | PostgreSQL 16 | ACID, JSONB, full-text search, proven at scale |
| **Cache** | Redis 7 | Session store, exam state, rate limiting |
| **Search** | Elasticsearch / OpenSearch | Question bank full-text, log analytics |
| **Message Queue** | Apache Kafka | High-throughput event streaming for grading pipeline |
| **File Storage** | AWS S3 / MinIO | Scalable object storage, pre-signed URLs |
| **Vector DB** | Pinecone / pgvector | Embedding storage for similarity and RAG |
| **AI/ML** | PyTorch, Hugging Face Transformers, LangChain | State-of-art NLP, fine-tuning, RAG pipelines |
| **ML Ops** | MLflow, Kubeflow | Experiment tracking, model registry, deployment |
| **Cloud** | AWS (EKS, RDS, S3, CloudFront) | Mature services, global reach, compliance certifications |
| **Container** | Docker | Consistent environments across dev/staging/prod |
| **Orchestration** | Kubernetes (EKS) | Auto-scaling, self-healing, rolling deployments |
| **CI/CD** | GitHub Actions + ArgoCD | Automated testing, GitOps deployments |
| **IaC** | Terraform | Reproducible infrastructure |
| **Monitoring** | Prometheus + Grafana + Datadog | Metrics, dashboards, alerting |
| **Logging** | ELK Stack (Elasticsearch, Logstash, Kibana) | Centralized log aggregation |
| **Tracing** | Jaeger / OpenTelemetry | Distributed request tracing |
| **Security Scanning** | Snyk, SonarQube, OWASP ZAP | SAST, dependency scanning, DAST |

---

# 11. Development Roadmap

## 11.1 Phase-wise Development Plan

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 0: Discovery** | 4 weeks | Requirements validation, architecture sign-off, UI mockups |
| **Phase 1: MVP Core** | 12 weeks | Auth, user management, question bank, basic exam delivery, objective grading |
| **Phase 2: AI & Proctoring** | 10 weeks | AI question gen, subjective grading, proctoring module |
| **Phase 3: Analytics & Reports** | 8 weeks | Dashboards, report generation, notifications |
| **Phase 4: Enterprise Hardening** | 8 weeks | Multi-tenancy, SSO, audit, performance optimization |
| **Phase 5: Scale & Launch** | 6 weeks | Load testing, security audit, production deployment |

**Total Timeline:** ~48 weeks (12 months)

## 11.2 Agile Sprint Breakdown (Phase 1 Example)

| Sprint | Focus | Stories |
|--------|-------|---------|
| S1 | Project setup, CI/CD, auth service | Login, register, JWT, MFA |
| S2 | User service | Student/teacher CRUD, bulk import |
| S3 | Question service | Question CRUD, tagging, search |
| S4 | Exam service (part 1) | Exam creation, scheduling, enrollment |
| S5 | Exam service (part 2) | Exam delivery UI, timer, auto-save |
| S6 | Evaluation service | Objective grading, result calculation |

## 11.3 Team Structure

| Role | Count | Responsibility |
|------|-------|----------------|
| Project Manager | 1 | Timeline, stakeholder communication |
| Solution Architect | 1 | Architecture, technical decisions |
| Backend Developers | 4 | Microservices, APIs, integrations |
| Frontend Developers | 3 | Portals, exam UI, responsive design |
| AI/ML Engineers | 2 | Models, training pipelines, inference |
| DevOps Engineer | 2 | CI/CD, Kubernetes, monitoring |
| QA Engineers | 2 | Test automation, performance, security |
| UI/UX Designer | 1 | Wireframes, design system |
| Security Engineer | 1 | Pen testing, compliance (part-time) |

**Total Team:** 17 members

## 11.4 Cost Estimation (Annual)

| Category | Cost (USD) |
|----------|------------|
| Team salaries (17 × avg $80K) | $1,360,000 |
| Cloud infrastructure (AWS) | $180,000 |
| Third-party services (SMS, email, AI APIs) | $60,000 |
| Tools & licenses | $40,000 |
| Security audits | $30,000 |
| Contingency (15%) | $241,500 |
| **Total Year 1** | **~$1,911,500** |

*MVP subset (8-person team, 6 months): ~$450,000–$600,000*

## 11.5 Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI grading inaccuracy | Medium | High | Human-in-the-loop, dual evaluation, continuous model retraining |
| Exam day outage | Low | Critical | Multi-AZ, load testing, runbook, communication plan |
| Data breach | Low | Critical | Encryption, pen testing, SOC 2, incident response plan |
| Low user adoption | Medium | Medium | Pilot program, training, intuitive UX |
| Regulatory changes | Medium | Medium | Modular compliance layer, legal review |
| Scope creep | High | Medium | Strict phase gates, change control board |
| Third-party AI API cost overrun | Medium | Medium | Self-hosted models, caching, batch inference |

---

# 12. Testing Strategy

## 12.1 Unit Testing

- **Coverage target:** ≥ 80% for business logic
- **Backend:** Jest (NestJS), pytest (FastAPI)
- **Frontend:** Vitest + React Testing Library
- **Focus:** Grading algorithms, grade calculation, permission checks

## 12.2 Integration Testing

- API contract tests (Pact)
- Database integration with test containers (Testcontainers)
- Kafka event flow verification
- End-to-end service chain: exam submit → grade → result

## 12.3 Performance Testing

| Scenario | Target |
|----------|--------|
| 100K concurrent exam sessions | p95 latency < 500ms for auto-save |
| 10K simultaneous submissions | All processed within 10 minutes |
| Question search (1M records) | < 1s response |
| **Tools:** k6, Gatling, AWS Load Testing |

## 12.4 Security Testing

- SAST: SonarQube in CI pipeline
- DAST: OWASP ZAP weekly scans
- Dependency scanning: Snyk
- Penetration testing: Quarterly external assessment
- Bug bounty program (post-launch)

## 12.5 AI Model Validation

- Hold-out test set (20%) never seen during training
- Inter-rater reliability vs expert graders (Cohen's κ)
- Bias audit across demographic groups
- A/B testing new model versions against production
- Monitoring: score distribution drift, confidence calibration

## 12.6 User Acceptance Testing (UAT)

- 2-week pilot with 500 students, 20 faculty
- Test scripts for critical flows (exam take, grade, result)
- Feedback collection via structured surveys
- Sign-off from academic committee before go-live

---

# 13. Deployment Strategy

## 13.1 CI/CD Pipeline

```
Developer Push → GitHub
    │
    ▼
GitHub Actions
    ├── Lint & Type Check
    ├── Unit Tests
    ├── Integration Tests
    ├── SAST (SonarQube)
    ├── Build Docker Images
    └── Push to ECR
         │
         ▼
    ArgoCD (GitOps)
         ├── Deploy to Staging (auto)
         ├── Smoke Tests
         └── Deploy to Production (manual approval)
```

## 13.2 Docker Setup

```dockerfile
# Example: exam-service Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
EXPOSE 3000
HEALTHCHECK CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

## 13.3 Kubernetes Deployment

```yaml
# exam-service deployment (simplified)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: exam-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: exam-service
  template:
    spec:
      containers:
      - name: exam-service
        image: ecr.aws/exam-service:latest
        resources:
          requests: { cpu: "250m", memory: "512Mi" }
          limits: { cpu: "1000m", memory: "1Gi" }
        livenessProbe:
          httpGet: { path: /health, port: 3000 }
        readinessProbe:
          httpGet: { path: /ready, port: 3000 }
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: exam-service-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: exam-service
  minReplicas: 3
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 13.4 Cloud Hosting

- **Production:** AWS EKS across 3 AZs (us-east-1 + eu-west-1 for DR)
- **Staging:** Single AZ, scaled-down replicas
- **Development:** Docker Compose locally + shared dev cluster

## 13.5 Monitoring & Logging

| Signal | Tool | Alert Threshold |
|--------|------|-----------------|
| Metrics | Prometheus + Grafana | CPU > 80%, error rate > 1% |
| Logs | ELK / CloudWatch Logs | Error spike > 10/min |
| Traces | Jaeger | p99 latency > 2s |
| Uptime | Pingdom / AWS Route 53 | Any endpoint down |
| AI Models | MLflow + custom dashboards | Confidence drift > 10% |

**On-call:** PagerDuty rotation, incident runbooks, post-mortem process.

---

# 14. Future Enhancements

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **Generative AI Examiner** | Conversational oral exams with adaptive follow-up questions | High |
| **Voice-Based Exams** | Speech-to-text answer capture with pronunciation assessment | Medium |
| **Blockchain Certificates** | Immutable, verifiable digital certificates and transcripts | Medium |
| **Adaptive Testing (CAT)** | Item Response Theory-based dynamic difficulty adjustment | High |
| **Learning Analytics** | Knowledge graph mapping, skill gap analysis, learning path optimization | High |
| **Multi-Language Support** | i18n for UI, multilingual question generation and evaluation | High |
| **Offline Exam Mode** | Downloadable exam packages for low-connectivity regions | Medium |
| **AR/VR Lab Exams** | Virtual lab environments for practical assessments | Low |
| **Federated Learning** | Cross-institution model training without sharing raw data | Low |
| **Mobile Native Apps** | iOS/Android apps with enhanced proctoring | Medium |

---

# Appendix A: Glossary

| Term | Definition |
|------|------------|
| CAT | Computerized Adaptive Testing |
| IRT | Item Response Theory |
| RAG | Retrieval-Augmented Generation |
| RBAC | Role-Based Access Control |
| QTI | Question and Test Interoperability standard |
| Proctoring | Remote exam monitoring |
| Tenant | An isolated institution instance in multi-tenant SaaS |

# Appendix B: Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-24 | System Architect | Initial comprehensive blueprint |

---

*End of Document*
