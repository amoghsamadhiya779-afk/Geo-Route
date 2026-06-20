# Handoff Report — Explorer 2

This handoff report summarizes the codebase exploration, design requirements, and the clean OOP LLD architecture proposed to separate prediction and mocking logic for GeoRoute's predictive routing backend.

---

## 1. Observation

During our investigation of the codebase and previous agent reports, we observed:
* **`backend/app.py`**: Coordinates API requests. The existing routing simulation endpoint snaps coords and calls C++:
  ```python
  @app.post("/api/v1/simulate/{city_id}")
  def simulate_route(city_id: str, req: RouteRequest):
      # ...
      result = gm.compute_route(...)
      return result
  ```
* **`backend/graph_manager.py`**: Manages graph files and lazy-loads them using `georoute_core` (lines 45-61).
* **`backend/georoute_core.py`**: Acts as a Python fallback/mock helper (lines 59-101) for route computations if the compiled C++ extension is missing.
* **`data/cities.json`**: Lists center coordinates and graph paths for 16 cities (e.g., Manhattan center is `{"lat": 40.7831, "lon": -73.9712}`).
* **`explorer_m1_3/analysis.md`**: Implements a monolithic `PredictionEngine` (lines 124-286) that contains internal branch logic to switch between ML mode and Mock mode:
  ```python
  if self.model:
      try:
          # ... ML inference ...
      except Exception as e:
          # ... fallback to analytical ...
  # Analytical Fallback Mode
  ```

---

## 2. Logic Chain

1. **Requirement R3** demands architectural strictness and clean separation between prediction logic (which uses scikit-learn) and mocking logic (which simulates congestion patterns mathematically).
2. The monolithic `PredictionEngine` observed in `explorer_m1_3` violates the **Single Responsibility Principle (SRP)** by managing both machine learning inference and analytical traffic simulations in a single file/class. It also violates the **Open/Closed Principle (OCP)**, as adding a new prediction strategy (e.g. deep learning or historical averages) requires modifying the core engine class.
3. To resolve this, we must define a common contract—**`PredictorInterface`**—that abstracts route travel time prediction and traffic density prediction.
4. We can then subclass this interface into:
   - **`MLPredictor`**: Encapsulates scikit-learn loading, feature extraction via `FeatureExtractor`, and random forest tree-variance confidence estimation.
   - **`MockPredictor`**: Runs pure-Python mathematical congestion and density math, without importing `scikit-learn` or requiring `.joblib` files.
5. A **`PredictorFactory`** handles instantiation, automatically checking for dependency and model file existence to instantiate `MLPredictor` or fall back to `MockPredictor` gracefully.
6. Consequently, `backend/app.py` can load the predictor polymorphically. This makes the endpoints closed to prediction details and ensures environment independence.

---

## 3. Caveats

* **Model Serialization Format**: We assumed the ML model is trained as a scikit-learn `Pipeline` consisting of a `ColumnTransformer` (preprocessor) and a `RandomForestRegressor`. If a different model type is used, the estimators-based confidence score logic in `MLPredictor` may need adjustments.
* **Write Permissions**: As a read-only Explorer, we did not write or modify any source code files. The proposed design is documented in `analysis.md` for future implementers.

---

## 4. Conclusion

A clean, SOLID-compliant OOP architecture separating prediction and mocking logic has been designed and documented in `backend/prediction_engine.py` (proposed). The design introduces:
* `PredictorInterface` (ABC defining contract)
* `MLPredictor` (Real ML inference strategy)
* `MockPredictor` (Analytical simulation strategy)
* `FeatureExtractor` (Feature engineering pipeline)
* `PredictorFactory` (Creation & dynamic fallback manager)

This design ensures the backend can boot up and run on any local machine (even if ML dependencies or trained models are missing) and is open to future extension.

---

## 5. Verification Method

Future implementers can verify this design using these steps:
1. **Source File Verification**: Inspect `backend/prediction_engine.py` to ensure it contains the proposed classes with correct method signatures.
2. **Dynamic Fallback Verification**:
   * **Test Case A (ML Mode)**: Place a mock trained model at `backend/models/traffic_model.joblib`. Run `pytest backend/tests/test_predictions.py` and verify it passes. Check stdout to confirm `Loaded MLPredictor successfully` is logged.
   * **Test Case B (Fallback Mode)**: Rename or delete `backend/models/traffic_model.joblib`. Run `pytest backend/tests/test_predictions.py`. Verify all tests still pass and stdout logs `Model file not found. Falling back to MockPredictor`.
3. **Execution Commands**:
   ```bash
   # Run prediction test suite
   pytest backend/tests/test_predictions.py
   ```
