import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import {
  addProjectMember,
  createProject,
  deleteDocument,
  deleteProject,
  deleteProjectMember,
  deleteTelegramBot,
  fetchDocumentDetail,
  fetchDocuments,
  fetchMessages,
  fetchProjectMembers,
  fetchProjects,
  fetchSessions,
  fetchTelegramBots,
  issueTelegramLinkCode,
  queryDocuments,
  registerTelegramBot,
  setUnauthorizedHandler,
} from './api';
import { AdminApp } from './components/admin/AdminApp';
import { AuthScreen, type OAuthFeedback } from './components/AuthScreen';
import { MemberManagement } from './components/MemberManagement';
import { Modal } from './components/Modal';
import { UploadForm } from './components/UploadForm';
import { WorkspaceMain } from './components/WorkspaceMain';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import type {
  AnswerMode,
  ChatMessage,
  ChatSession,
  DocumentDetail,
  DocumentItem,
  DocumentStatus,
  Project,
  ProjectMember,
  ProjectRole,
} from './types';

const tokenKey = 'document-rag-token';
const typewriterDelayMs = 14;
const toastDurationMs = 5000;
type AnswerStatus = 'idle' | 'waiting' | 'typing';

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

function decodeToken(token: string): { email?: string; role?: string } {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return {};
    }
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
    return JSON.parse(window.atob(paddedPayload)) as { email?: string; role?: string };
  } catch {
    return {};
  }
}

function getEmailFromToken(token: string) {
  return decodeToken(token).email ?? '';
}

function getRoleFromToken(token: string) {
  return decodeToken(token).role ?? 'USER';
}

// 백엔드 OAuth success/failure 핸들러가 ?oauth_error=... 로 돌려보내는 코드별 안내 메시지
function oauthErrorFeedback(code: string): OAuthFeedback {
  switch (code) {
    case 'signup':
      // 이번 구글 로그인에서 계정이 새로 생성된 경우
      return { type: 'notice', message: '가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.' };
    case 'pending':
      // 이미 가입돼 승인 대기 중인 계정으로 다시 로그인한 경우
      return { type: 'notice', message: '가입 승인 대기 중입니다. 관리자 승인 후 로그인할 수 있습니다.' };
    case 'rejected':
      return { type: 'error', message: '가입이 거절된 계정입니다. 관리자에게 문의해주세요.' };
    case 'disabled':
      return { type: 'error', message: '비활성화된 계정입니다. 관리자에게 문의해주세요.' };
    default:
      return { type: 'error', message: '구글 로그인에 실패했습니다. 다시 시도해주세요.' };
  }
}

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) || '');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [oauthFeedback, setOauthFeedback] = useState<OAuthFeedback | null>(null);

  useEffect(() => {
    // 구글 OAuth 콜백 처리: 성공 시 ?token=, 승인 대기/실패 시 ?oauth_error= 로 돌아온다.
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const errorCode = params.get('oauth_error');
    if (urlToken) {
      localStorage.setItem(tokenKey, urlToken);
      setSessionExpired(false);
      setToken(urlToken);
    } else if (errorCode) {
      setOauthFeedback(oauthErrorFeedback(errorCode));
    }
    if (urlToken || errorCode) {
      // 토큰/에러 파라미터가 주소창에 남지 않도록 정리한다.
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // 인증된 요청이 401을 받으면(세션 만료 등) 토큰을 비우고 로그인 화면으로 돌려보낸다.
    setUnauthorizedHandler(() => {
      localStorage.removeItem(tokenKey);
      setToken('');
      setSessionExpired(true);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  function handleAuthenticated(accessToken: string) {
    localStorage.setItem(tokenKey, accessToken);
    setSessionExpired(false);
    setToken(accessToken);
  }

  function handleLogout() {
    localStorage.removeItem(tokenKey);
    setToken('');
  }

  if (!token) {
    return (
      <AuthScreen
        onAuthenticated={handleAuthenticated}
        sessionExpired={sessionExpired}
        oauthFeedback={oauthFeedback}
      />
    );
  }

  if (getRoleFromToken(token) === 'SUPER_ADMIN') {
    return <AdminApp token={token} onLogout={handleLogout} />;
  }

  return <Workspace token={token} onLogout={handleLogout} />;
}

function Workspace({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<ProjectRole>('MEMBER');
  const [question, setQuestion] = useState('');
  const [answerMode, setAnswerMode] = useState<AnswerMode>('STRICT');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.2);
  const [error, setError] = useState('');
  const [projectError, setProjectError] = useState('');
  const [deleteProjectError, setDeleteProjectError] = useState('');
  const [memberError, setMemberError] = useState('');
  const [busy, setBusy] = useState(false);
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('idle');
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isMemberModalOpen, setMemberModalOpen] = useState(false);

  const currentProject = useMemo(
    () => projects.find((project) => project.projectId === currentProjectId) ?? null,
    [projects, currentProjectId],
  );

  const userEmail = useMemo(() => getEmailFromToken(token), [token]);

  const isProjectAdmin = currentProject?.role === 'ADMIN';

  const selectedDocuments = useMemo(
    () => documents.filter((document) => selectedIds.includes(document.documentId)),
    [documents, selectedIds],
  );

  const latestSources = useMemo(() => {
    const assistantMessage = [...messages].reverse().find((message) => message.role === 'ASSISTANT');
    return assistantMessage?.sources ?? [];
  }, [messages]);

  async function loadProjectData(projectId: number) {
    const [documentItems, memberItems, sessionItems] = await Promise.all([
      fetchDocuments(token, projectId),
      fetchProjectMembers(token, projectId),
      fetchSessions(token, projectId),
    ]);
    setDocuments(documentItems);
    setMembers(memberItems);
    setSessions(sessionItems);
    setSelectedIds((current) => current.filter((id) => documentItems.some((document) => document.documentId === id)));
    setCurrentSessionId((current) => (
      current && sessionItems.some((session) => session.sessionId === current) ? current : null
    ));
  }

  async function refresh() {
    setError('');
    try {
      const projectItems = await fetchProjects(token);
      setProjects(projectItems);
      const nextProjectId = currentProjectId && projectItems.some((project) => project.projectId === currentProjectId)
        ? currentProjectId
        : projectItems[0]?.projectId ?? null;
      setCurrentProjectId(nextProjectId);
      if (nextProjectId) {
        await loadProjectData(nextProjectId);
      } else {
        setDocuments([]);
        setMembers([]);
        setSessions([]);
        setSelectedIds([]);
        setCurrentSessionId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.');
    }
  }

  useEffect(() => {
    // 마운트 시 1회만 초기 데이터를 로드한다 (refresh는 매 렌더마다 재생성되므로 deps에 넣지 않는다)
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentProjectIdRef = useRef(currentProjectId);
  useEffect(() => {
    currentProjectIdRef.current = currentProjectId;
  }, [currentProjectId]);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  function pushToast(type: Toast['type'], message: string) {
    const id = ++toastIdRef.current;
    setToasts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, toastDurationMs);
  }

  function dismissToast(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  const documentStatusesRef = useRef<Map<number, DocumentStatus>>(new Map());
  useEffect(() => {
    // 폴링/새로고침으로 문서 상태가 처리 중 → 완료/실패로 바뀌면 토스트로 알린다
    const previous = documentStatusesRef.current;
    for (const document of documents) {
      const prevStatus = previous.get(document.documentId);
      if (prevStatus !== 'UPLOADED' && prevStatus !== 'PROCESSING') {
        continue;
      }
      if (document.status === 'COMPLETED') {
        pushToast('success', `'${document.title}' 문서 처리가 완료되었습니다.`);
      } else if (document.status === 'FAILED') {
        pushToast('error', `'${document.title}' 문서 처리에 실패했습니다.`);
      }
    }
    documentStatusesRef.current = new Map(
      documents.map((document) => [document.documentId, document.status]),
    );
  }, [documents]);

  useEffect(() => {
    // 업로드 후 백그라운드 처리(추출/chunk/embedding) 중인 문서가 있는 동안 목록을 주기적으로 갱신한다
    if (!currentProjectId) {
      return;
    }
    const hasPending = documents.some(
      (document) => document.status === 'UPLOADED' || document.status === 'PROCESSING',
    );
    if (!hasPending) {
      return;
    }
    const projectId = currentProjectId;
    const timer = window.setTimeout(async () => {
      try {
        const items = await fetchDocuments(token, projectId);
        // 폴링 응답이 돌아오기 전에 프로젝트를 전환했으면 결과를 버린다
        if (currentProjectIdRef.current === projectId) {
          setDocuments(items);
        }
      } catch {
        // 폴링 실패는 무시하고 다음 갱신 주기에서 재시도한다
      }
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [documents, currentProjectId, token]);

  async function selectProject(projectId: number) {
    setError('');
    setCurrentProjectId(projectId);
    setDetail(null);
    setSelectedIds([]);
    setCurrentSessionId(null);
    setMessages([]);
    try {
      await loadProjectData(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로젝트 데이터를 불러오지 못했습니다.');
    }
  }

  async function submitProject(event: FormEvent) {
    event.preventDefault();
    if (!projectName.trim()) {
      setProjectError('프로젝트 제목을 입력해주세요.');
      return;
    }
    setProjectError('');
    try {
      const project = await createProject(token, projectName.trim(), projectDescription.trim());
      setProjectName('');
      setProjectDescription('');
      setProjectModalOpen(false);
      setCurrentProjectId(project.projectId);
      setProjects(await fetchProjects(token));
      await loadProjectData(project.projectId);
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : '프로젝트 생성에 실패했습니다.');
    }
  }

  async function submitMember(event: FormEvent) {
    event.preventDefault();
    if (!currentProjectId) {
      setMemberError('프로젝트를 먼저 선택해주세요.');
      return;
    }
    if (!memberEmail.trim()) {
      setMemberError('이메일을 입력해주세요.');
      return;
    }
    setMemberError('');
    try {
      await addProjectMember(token, currentProjectId, memberEmail.trim(), memberRole);
      setMemberEmail('');
      setMemberRole('MEMBER');
      setMembers(await fetchProjectMembers(token, currentProjectId));
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : '멤버 추가에 실패했습니다.');
    }
  }

  async function removeMember(memberUserId: number) {
    if (!currentProjectId) {
      setMemberError('프로젝트를 먼저 선택해주세요.');
      return;
    }
    if (!isProjectAdmin) {
      setMemberError('프로젝트 관리자만 수행할 수 있습니다.');
      return;
    }
    setMemberError('');
    try {
      await deleteProjectMember(token, currentProjectId, memberUserId);
      setMembers(await fetchProjectMembers(token, currentProjectId));
      setProjects(await fetchProjects(token));
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : '멤버 삭제에 실패했습니다.');
    }
  }

  async function inspect(documentId: number) {
    if (!currentProjectId) {
      setError('프로젝트를 먼저 선택해주세요.');
      return;
    }
    setError('');
    try {
      setDetail(await fetchDocumentDetail(token, currentProjectId, documentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 상세 조회에 실패했습니다.');
    }
  }

  async function openSession(sessionId: number) {
    if (!currentProjectId) {
      setError('프로젝트를 먼저 선택해주세요.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const sessionMessages = await fetchMessages(token, currentProjectId, sessionId);
      setCurrentSessionId(sessionId);
      setMessages(sessionMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '대화 내역 조회에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  function startNewSession() {
    setCurrentSessionId(null);
    setMessages([]);
    setQuestion('');
    setError('');
  }

  async function remove(documentId: number) {
    if (!currentProjectId) {
      setError('프로젝트를 먼저 선택해주세요.');
      return;
    }
    if (!isProjectAdmin) {
      setError('프로젝트 관리자만 문서를 삭제할 수 있습니다.');
      return;
    }
    setError('');
    try {
      await deleteDocument(token, currentProjectId, documentId);
      if (detail?.documentId === documentId) {
        setDetail(null);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 삭제에 실패했습니다.');
    }
  }

  function revealAssistantMessage(content: string, sources: ChatMessage['sources']) {
    const characters = Array.from(content);
    const createdAt = new Date().toISOString();
    setMessages((current) => [
      ...current,
      {
        role: 'ASSISTANT',
        content: '',
        sources,
        createdAt,
      },
    ]);

    if (characters.length === 0) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      let index = 0;
      const timer = window.setInterval(() => {
        index += 1;
        const nextContent = characters.slice(0, index).join('');
        setMessages((current) => current.map((message) => (
          message.createdAt === createdAt ? { ...message, content: nextContent } : message
        )));

        if (index >= characters.length) {
          window.clearInterval(timer);
          resolve();
        }
      }, typewriterDelayMs);
    });
  }

  async function ask(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) {
      return;
    }
    if (!currentProjectId) {
      setError('프로젝트를 먼저 선택해주세요.');
      return;
    }
    setBusy(true);
    setAnswerStatus('waiting');
    setError('');
    const userMessage: ChatMessage = {
      role: 'USER',
      content: question.trim(),
      sources: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage]);
    try {
      // HYBRID(문서+AI 보충)에서는 엄격도를 적용하지 않는다(슬라이더 비활성). 기본값을 쓰도록 undefined로 보낸다.
      const thresholdToSend = answerMode === 'HYBRID' ? undefined : similarityThreshold;
      const response = await queryDocuments(token, userMessage.content, currentProjectId, selectedIds, currentSessionId ?? undefined, answerMode, thresholdToSend);
      setCurrentSessionId(response.sessionId);
      setAnswerStatus('typing');
      await revealAssistantMessage(response.answer, response.sources);
      setQuestion('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '질문 요청에 실패했습니다.');
    } finally {
      setAnswerStatus('idle');
      setBusy(false);
    }
  }

  function toggle(documentId: number) {
    setSelectedIds((current) => (
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    ));
  }

  function updateMemberEmail(email: string) {
    setMemberEmail(email);
    if (memberError) {
      setMemberError('');
    }
  }

  function openMemberModal() {
    setMemberError('');
    setMemberModalOpen(true);
  }

  function closeMemberModal() {
    setMemberError('');
    setMemberModalOpen(false);
  }

  function openProjectModal() {
    setProjectError('');
    setProjectModalOpen(true);
  }

  function closeProjectModal() {
    setProjectError('');
    setProjectName('');
    setProjectDescription('');
    setProjectModalOpen(false);
  }

  function openDeleteProjectModal(project: Project) {
    setDeleteProjectError('');
    setProjectToDelete(project);
  }

  function closeDeleteProjectModal() {
    setDeleteProjectError('');
    setProjectToDelete(null);
  }

  async function confirmDeleteProject() {
    if (!projectToDelete) {
      return;
    }
    setDeleteProjectError('');
    try {
      await deleteProject(token, projectToDelete.projectId);
      if (projectToDelete.projectId === currentProjectId) {
        setDetail(null);
        setSelectedIds([]);
        setCurrentSessionId(null);
        setMessages([]);
        setQuestion('');
      }
      setProjectToDelete(null);
      await refresh();
    } catch (err) {
      setDeleteProjectError(err instanceof Error ? err.message : '프로젝트 삭제에 실패했습니다.');
    }
  }

  return (
    <main className="workspace">
      <WorkspaceSidebar
        documents={documents}
        sessions={sessions}
        currentProjectId={currentProjectId}
        currentSessionId={currentSessionId}
        selectedIds={selectedIds}
        isProjectAdmin={isProjectAdmin}
        onRefresh={refresh}
        onToggleDocument={toggle}
        onInspectDocument={inspect}
        onRemoveDocument={remove}
        onToggleAllDocuments={() => {
          setSelectedIds((current) => (
            current.length === documents.length ? [] : documents.map((document) => document.documentId)
          ));
        }}
        onOpenUploadModal={() => setUploadModalOpen(true)}
        onStartNewSession={startNewSession}
        onOpenSession={openSession}
      />

      <WorkspaceMain
        currentProject={currentProject}
        currentProjectId={currentProjectId}
        projects={projects}
        documents={documents}
        sessions={sessions}
        selectedDocuments={selectedDocuments}
        messages={messages}
        latestSources={latestSources}
        detail={detail}
        question={question}
        error={error}
        busy={busy}
        answerStatus={answerStatus}
        onQuestionChange={setQuestion}
        answerMode={answerMode}
        onAnswerModeChange={setAnswerMode}
        similarityThreshold={similarityThreshold}
        onSimilarityThresholdChange={setSimilarityThreshold}
        onAsk={ask}
        onOpenUploadModal={() => setUploadModalOpen(true)}
        onOpenMemberModal={openMemberModal}
        onOpenProjectModal={openProjectModal}
        onOpenDeleteProjectModal={openDeleteProjectModal}
        onSelectProject={selectProject}
        onStartNewSession={startNewSession}
        onLogout={onLogout}
        onIssueTelegramCode={() => issueTelegramLinkCode(token)}
        onFetchBots={(projectId) => fetchTelegramBots(token, projectId)}
        onRegisterBot={(projectId, botToken) => registerTelegramBot(token, projectId, botToken)}
        onDeleteBot={(projectId, installationId) => deleteTelegramBot(token, projectId, installationId)}
        userEmail={userEmail}
      />

      {isProjectModalOpen && (
        <Modal title="프로젝트 추가" onClose={closeProjectModal}>
          <form className="modal-form" onSubmit={submitProject}>
            <label>
              프로젝트 제목
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="예: 사내 보안 문서"
              />
            </label>
            <label>
              간단한 설명
              <textarea
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                placeholder="프로젝트 목적이나 포함할 문서 범위를 적어주세요."
                rows={4}
              />
            </label>
            {projectError && <p className="error-text">{projectError}</p>}
            <button className="primary-button" type="submit">
              프로젝트 생성
            </button>
          </form>
        </Modal>
      )}

      {projectToDelete && (
        <Modal title="프로젝트 삭제" onClose={closeDeleteProjectModal}>
          <div className="delete-confirm">
            <p>
              프로젝트 이름: {projectToDelete.name}
              <br />
              삭제 하시겠습니까??
            </p>
            <small>프로젝트의 모든 내용이 삭제 됩니다.</small>
            {deleteProjectError && <p className="error-text">{deleteProjectError}</p>}
            <div className="modal-actions">
              <button className="ghost-button" onClick={closeDeleteProjectModal} type="button">
                취소
              </button>
              <button className="primary-button danger-button" onClick={confirmDeleteProject} type="button">
                삭제
              </button>
            </div>
          </div>
        </Modal>
      )}

      {isUploadModalOpen && (
        <Modal title="파일 등록" onClose={() => setUploadModalOpen(false)}>
          <UploadForm
            token={token}
            projectId={currentProjectId}
            onUploaded={refresh}
            onComplete={() => setUploadModalOpen(false)}
          />
        </Modal>
      )}

      {isMemberModalOpen && (
        <Modal title="멤버 관리" onClose={closeMemberModal}>
          <MemberManagement
            members={members}
            isProjectAdmin={isProjectAdmin}
            currentProjectId={currentProjectId}
            memberEmail={memberEmail}
            memberRole={memberRole}
            memberError={memberError}
            onMemberEmailChange={updateMemberEmail}
            onMemberRoleChange={setMemberRole}
            onSubmitMember={submitMember}
            onRemoveMember={removeMember}
          />
        </Modal>
      )}

      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map((toast) => (
            <div className={`toast toast-${toast.type}`} key={toast.id} role="status">
              {toast.type === 'success' ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
              <span>{toast.message}</span>
              <button className="toast-close" onClick={() => dismissToast(toast.id)} title="닫기" type="button">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
