---
description: Strict constraints for search queries, location-based filtering, and UI testing methodologies in MehndiGo.
---

# MehndiGo Search & Location Filtering Guidelines

## 1. Location-Based Filtering (The Haversine Rule)
When implementing or modifying APIs that fetch artists based on a customer's location (e.g., Nearby, Nearest, Top Rated), you MUST adhere to the following strict rules:

- **Source of Truth:** Distance is the absolute source of truth. Do NOT filter or sort artists based on their "district name" or "city" if a radius is required.
- **SQL Execution:** The distance calculation (Haversine formula) MUST be executed natively in the backend database (SQLite/D1), not post-processed in JavaScript.
- **Strict Formula:** The filtering condition must strictly be: `distance <= MIN(35, COALESCE(CAST(artist.service_radius AS REAL), 35.0))`. SQLite dynamically types columns, so you MUST use `CAST(... AS REAL)` to prevent math calculation failures when strings are stored.
- **Missing Location Fallback:** If `lat` or `lng` is NOT provided, and the query/sort explicitly asks for "nearest" or "nearby", you MUST inject a strict `1=0` `WHERE` clause. Do NOT fallback to returning global artists for location-based queries.
- **Handling NULLs:** If an artist's `latitude` or `longitude` is `NULL`, they MUST be excluded entirely from radius-based results (`ap.latitude IS NOT NULL`). NEVER fallback to the customer's coordinates or a default city coordinate.

## 2. Text-Based Quick Filter Mapping
When handling the `/customer/search` or related list APIs:
- The frontend passes string-based filter values (e.g., `filter="5+ Exp Years"`, `filter="Bridal"`, `filter="Verified"`).
- You MUST explicitly map these text-based strings to proper SQL `WHERE` clauses. Do not rely solely on them for `ORDER BY` sorting, as this fails to filter out ineligible results.

## 3. Physical Device Testing Mandate
When performing end-to-end verification of mobile UI flows (especially those involving device hardware like GPS, permissions, or deep linking):

- **No Emulators:** Do NOT use or suggest using an Android Emulator.
- **Physical ADB:** All testing must be conducted on the connected physical Android device using ADB and UIAutomator.
- **Agent Autonomy:** The agent must operate the phone autonomously via ADB commands without asking the user to perform manual steps (e.g., launching the app, tapping permission prompts, scrolling).