# Plan: Milestone 1: ML Predictive Backend

This plan outlines the steps to build and integrate the predictive ML pipeline, structure the backend code using clean OOP/LLD principles, expose the prediction API, and programmatically verify the implementation.

## Phase 1: Exploration
- **Spawn Explorers** to:
  - Investigate the existing codebase and requirements.
  - Review the mock routing logic in `georoute_core.py`.
  - Design a data simulator that generates traffic time series based on time-of-day, day-of-week, and coordinate distances.
  - Design the clean OOP interface structure separating ML predictor, mocks, and routing.
  - Propose file structure and code changes.

## Phase 2: Implementation
- **Spawn Worker** to:
  - Implement simulated data generation and model training scripts in a new `backend/ml/` or similar directory.
  - Train a scikit-learn regression model (e.g. Random Forest Regressor) and serialize it.
  - Implement the OOP/LLD abstraction layers for prediction engine.
  - Integrate FastAPI endpoint `POST /api/v1/predict` following the interface contract.
  - Write unit tests for the ML pipeline and prediction code.

## Phase 3: Review and Challenge
- **Spawn Reviewers** to independently evaluate the implementation for correctness, robustness, and architectural cleanliness (clean OOP, mock separation).
- **Spawn Challengers** to write stress tests/generators, verifying that the endpoint works for various time inputs and returns realistic, varying traversal times.

## Phase 4: Forensic Audit
- **Spawn Forensic Auditor** to verify integrity, ensuring there is no hardcoding of test outputs and the ML pipeline actually performs live inference.
