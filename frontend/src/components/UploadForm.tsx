import { FormEvent, useState } from 'react';
import { RefreshCw, Upload } from 'lucide-react';
import { uploadDocument } from '../api';

interface UploadFormProps {
  token: string;
  projectId: number | null;
  onUploaded: () => Promise<void>;
}

export function UploadForm({ token, projectId, onUploaded }: UploadFormProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (!file) {
      setError('파일을 선택해주세요.');
      return;
    }
    if (!projectId) {
      setError('프로젝트를 먼저 선택해주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await uploadDocument(token, projectId, title, file);
      setTitle('');
      setFile(null);
      setFileInputKey((value) => value + 1);
      await onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={submit}>
      <label>
        제목
        <input
          disabled={busy}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (error) {
              setError('');
            }
          }}
        />
      </label>
      <label>
        파일
        <input
          accept=".txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf"
          disabled={busy}
          key={fileInputKey}
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            if (error) {
              setError('');
            }
          }}
          type="file"
        />
      </label>
      {busy && (
        <div className="upload-progress" aria-live="polite" role="status">
          <div className="upload-progress-track">
            <span />
          </div>
          <p>문서 업로드 중입니다.</p>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
      <button className="primary-button" disabled={busy || !projectId} type="submit">
        {busy ? <RefreshCw className="spin" size={17} /> : <Upload size={17} />}
        {busy ? '업로드 중' : '업로드'}
      </button>
    </form>
  );
}
