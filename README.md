# RAASTA 🧭♿

### Routes that understand accessibility.

RAASTA is an accessibility-focused navigation system that combines real GPS routing with reported accessibility barriers.

While conventional navigation focuses mainly on distance and travel time, RAASTA asks a different question:

> **Can the person actually use this route?**

RAASTA checks routes against reported physical barriers and can reroute users when a path is no longer usable.

---

## 🎯 Problem

A route can be geographically valid while being physically unusable.

Wheelchair users and people with mobility needs can encounter:

- Stairs
- Missing or blocked ramps
- Broken sidewalks
- Construction
- Other physical barriers

A navigation system needs to consider not only where roads are, but whether those paths are usable for the person travelling.

---

## 💡 Our Solution

RAASTA turns accessibility reports into route decisions.

The routing flow is:

```text
User Request
     ↓
Start + Destination + Mobility Profile
     ↓
Real GPS Route
     ↓
Check Active Accessibility Barriers
     ↓
Reroute if Necessary
     ↓
Route + Alerts + Barrier Information
