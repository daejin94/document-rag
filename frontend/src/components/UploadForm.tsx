import { FormEvent, useState } from 'react';
import { AlertTriangle, RefreshCw, Upload } from 'lucide-react';
import { uploadDocument } from '../api';

interface UploadFormProps {
  token: string;
  projectId: number | null;
  onUploaded: () => Promise<void>;
  onComplete?: () => void;
}

interface UploadErrorNotice {
  title: string;
  description: string;
}

function formatUploadError(message: string): UploadErrorNotice {
  if (message.includes('OCR 처리된') || message.includes('텍스트를 충분히 읽을 수 없는 PDF')) {
    return {
      title: 'PDF 텍스트를 읽지 못했습니다.',
      description: '스캔본 또는 이미지 기반 PDF일 수 있습니다. OCR 처리된 TXT/MD/PDF로 변환한 뒤 다시 업로드해주세요.',
    };
  }
  return {
    title: '업로드를 완료하지 못했습니다.',
    description: message,
  };
}

export function UploadForm({ token, projectId, onUploaded, onComplete }: UploadFormProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const errorNotice = error ? formatUploadError(error) : null;

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
      onComplete?.();
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
          accept=".txt,.md,.markdown,.pdf,.png,.jpg,.jpeg,text/plain,text/markdown,application/pdf,image/png,image/jpeg"
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
      {errorNotice && (
        <div className="upload-error" role="alert">
          <AlertTriangle size={18} />
          <span>
            <strong>{errorNotice.title}</strong>
            <small>{errorNotice.description}</small>
          </span>
        </div>
      )}
      <button className="primary-button" disabled={busy || !projectId} type="submit">
        {busy ? <RefreshCw className="spin" size={17} /> : <Upload size={17} />}
        {busy ? '업로드 중' : '업로드'}
      </button>
    </form>
  );
}
