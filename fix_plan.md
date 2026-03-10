# Bug Fixes and Completing Integration

The following issues were identified and need to be fixed to make the system functional as proposed:

## 1. Accessibility
- [ ] Implement redirect from `/` to `/campaigns` in `frontend/app/page.tsx`.
- [ ] Enable CORS in `backend/src/main.ts` to allow frontend requests.

## 2. Functionality
- [ ] Implement actual API call in `frontend/app/campaigns/new/page.tsx` instead of `alert`.
- [ ] Update `frontend/app/campaigns/page.tsx` to fetch real data from the backend.
- [ ] Validate environment variables (`NEXT_PUBLIC_API_URL`) in frontend.

## 3. Infrastructure
- [ ] Verify Docker container communication (Frontend -> Backend).
