import MedicalProgressBar from './MedicalProgressBar';
import useApiLoadingStore from '../store/useApiLoadingStore';

// Mounted once in _app.jsx: shows the medical progress overlay for as long as
// any create/update/delete (POST/PUT/PATCH/DELETE) request is waiting on the
// server. Pages don't manage this themselves.
export default function GlobalProgress() {
  // `visible` already includes the 1-second minimum display time.
  const visible = useApiLoadingStore((s) => s.visible);
  return <MedicalProgressBar open={visible} label="Please wait..." />;
}
