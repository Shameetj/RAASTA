# QA Testing Checklist (Developer 4)

## Test Scenarios

### Scenario 1: Wheelchair Profile - Blocked Path Detection
- [ ] Select **Metro Station** as Origin and **Central Library** as Destination.
- [ ] Confirm direct route encounters the stairs blockage.
- [ ] Confirm direct route is rendered in red dashed lines.
- [ ] Confirm step-free alternative route is rendered in green.
- [ ] Confirm accessibility score displays ~88/100 ("Highly Accessible Via Detour").
- [ ] Confirm warning banner notifies user of the stairs ahead.

### Scenario 2: Wheelchair Profile - Clear Route
- [ ] Select **Hospital OPD** as Origin and **Civic Center** as Destination.
- [ ] Confirm route is unobstructed.
- [ ] Confirm accessibility score displays 95+/100 ("Fully Accessible").
- [ ] Confirm no red dashed segments appear.

### Scenario 3: Deaf / Hard of Hearing Profile
- [ ] Switch active profile to **Deaf / Hard of Hearing**.
- [ ] Calculate route with obstacle.
- [ ] Confirm visual alert banner flashes and displays high-contrast indicator.
- [ ] Confirm `navigator.vibrate` pattern triggers on supported hardware.
- [ ] Confirm screen pulse simulation activates on desktop screens.
- [ ] Confirm turn-by-turn cards show high-contrast visual cues and landmark hints.

### Scenario 4: Community Blockage Reporting
- [ ] Open "Report Blockage" modal.
- [ ] Submit a new barrier with title and coordinates.
- [ ] Confirm obstacle appears on map and is persisted in database.
