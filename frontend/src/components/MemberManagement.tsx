import type { FormEventHandler } from 'react';
import { Trash2, UserPlus, Users } from 'lucide-react';
import type { ProjectMember, ProjectRole } from '../types';

interface MemberManagementProps {
  members: ProjectMember[];
  isProjectAdmin: boolean;
  currentProjectId: number | null;
  memberEmail: string;
  memberRole: ProjectRole;
  memberError: string;
  onMemberEmailChange: (email: string) => void;
  onMemberRoleChange: (role: ProjectRole) => void;
  onSubmitMember: FormEventHandler<HTMLFormElement>;
  onRemoveMember: (memberUserId: number) => void;
}

export function MemberManagement({
  members,
  isProjectAdmin,
  currentProjectId,
  memberEmail,
  memberRole,
  memberError,
  onMemberEmailChange,
  onMemberRoleChange,
  onSubmitMember,
  onRemoveMember,
}: MemberManagementProps) {
  return (
    <div className="member-management">
      <section className="member-management-section">
        <div className="section-title">
          <Users size={17} />
          멤버 목록
        </div>
        <div className="member-list">
          {members.map((member) => (
            <div className="member-row" key={member.userId}>
              <span>
                <strong>{member.name}</strong>
                <small>{member.role} · {member.email}</small>
              </span>
              {isProjectAdmin && (
                <button className="icon-button danger" onClick={() => onRemoveMember(member.userId)} title="멤버 삭제" type="button">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
          {members.length === 0 && <p className="empty-text">멤버 없음</p>}
        </div>
      </section>

      {isProjectAdmin && (
        <section className="member-management-section">
          <div className="section-title">
            <UserPlus size={17} />
            멤버 추가
          </div>
          <form className="member-form modal-form" onSubmit={onSubmitMember}>
            {memberError && <p className="error-text">{memberError}</p>}
            <label>
              이메일
              <input
                value={memberEmail}
                onChange={(event) => onMemberEmailChange(event.target.value)}
                placeholder="user@example.com"
                type="email"
              />
            </label>
            <label>
              역할
              <select value={memberRole} onChange={(event) => onMemberRoleChange(event.target.value as ProjectRole)}>
                <option value="MEMBER">MEMBER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
            <button className="primary-button" disabled={!currentProjectId} type="submit">
              <UserPlus size={17} />
              추가
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
