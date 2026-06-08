// Re-export MyRsvps from the events feature so the profile-menu link `/me/rsvps`
// can resolve at module level (avoids router re-imports).
export { MyRsvpsScreen as default } from '../events/MyRsvpsScreen';
