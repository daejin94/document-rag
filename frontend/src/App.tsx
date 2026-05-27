import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  addProjectMember,
  createProject,
  deleteDocument,
  deleteProjectMember,
  fetchDocumentDetail,
  fetchDocuments,
  fetchMessages,
  fetchProjectMembers,
  fetchProjects,
  fetchSessions,
  queryDocuments,
} from './api';
import { AuthScreen } from './components/AuthScreen';
import { MemberManagement } from './components/MemberManagement';
import { Modal } from './components/Modal';
import { UploadForm } from './components/UploadForm';
import { WorkspaceMain } from './components/WorkspaceMain';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import type {
  ChatMessage,
  ChatSession,
  DocumentDetail,
  DocumentItem,
  Project,
  ProjectMember,
  ProjectRole,
} from './types';

const tokenKey = 'document-rag-token';

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) || '');

  function handleAuthenticated(accessToken: string) {
    localStorage.setItem(tokenKey, accessToken);
    setToken(accessToken);
  }

  if (!token) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return <Workspace token={token} onLogout={() => {
    localStorage.removeItem(tokenKey);
    setToken('');
  }} />;
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
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<ProjectRole>('MEMBER');
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [memberError, setMemberError] = useState('');
  const [busy, setBusy] = useState(false);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isMemberModalOpen, setMemberModalOpen] = useState(false);

  const currentProject = useMemo(
    () => projects.find((project) => project.projectId === currentProjectId) ?? null,
    [projects, currentProjectId],
  );

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
    void refresh();
  }, []);

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
      setError('프로젝트 이름을 입력해주세요.');
      return;
    }
    setError('');
    try {
      const project = await createProject(token, projectName.trim());
      setProjectName('');
      setCurrentProjectId(project.projectId);
      setProjects(await fetchProjects(token));
      await loadProjectData(project.projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로젝트 생성에 실패했습니다.');
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
    setError('');
    const userMessage: ChatMessage = {
      role: 'USER',
      content: question.trim(),
      sources: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage]);
    try {
      const response = await queryDocuments(token, userMessage.content, currentProjectId, selectedIds, currentSessionId ?? undefined);
      setCurrentSessionId(response.sessionId);
      setMessages((current) => [
        ...current,
        {
          role: 'ASSISTANT',
          content: response.answer,
          sources: response.sources,
          createdAt: new Date().toISOString(),
        },
      ]);
      setQuestion('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '질문 요청에 실패했습니다.');
    } finally {
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

  return (
    <main className="workspace">
      <WorkspaceSidebar
        projects={projects}
        documents={documents}
        sessions={sessions}
        currentProjectId={currentProjectId}
        currentSessionId={currentSessionId}
        projectName={projectName}
        selectedIds={selectedIds}
        isProjectAdmin={isProjectAdmin}
        onProjectNameChange={setProjectName}
        onSubmitProject={submitProject}
        onSelectProject={selectProject}
        onRefresh={refresh}
        onToggleDocument={toggle}
        onInspectDocument={inspect}
        onRemoveDocument={remove}
        onStartNewSession={startNewSession}
        onOpenSession={openSession}
        onLogout={onLogout}
      />

      <WorkspaceMain
        currentProject={currentProject}
        currentProjectId={currentProjectId}
        selectedDocuments={selectedDocuments}
        messages={messages}
        latestSources={latestSources}
        detail={detail}
        question={question}
        error={error}
        busy={busy}
        onQuestionChange={setQuestion}
        onAsk={ask}
        onOpenUploadModal={() => setUploadModalOpen(true)}
        onOpenMemberModal={openMemberModal}
      />

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
    </main>
  );
}
