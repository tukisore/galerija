"use client";

import { useState } from "react";
import { roles, users, type Role, type User } from "@/lib/api";
import { useList } from "@/lib/useList";
import PageHeader from "../PageHeader";
import Timestamp from "../Timestamp";

function RoleSelect({ value, onChange }: { value: Role; onChange: (role: Role) => void }) {
  return (
    <select className="input capitalize" aria-label="Role" value={value} onChange={(e) => onChange(e.target.value as Role)}>
      {roles.map((role) => (
        <option key={role} value={role}>
          {role}
        </option>
      ))}
    </select>
  );
}

const emptyUser: Omit<User, "id"> = { name: "", email: "", role: "viewer" };

function isComplete(user: Omit<User, "id">) {
  return Boolean(user.name.trim() && user.email.trim());
}

export default function UsersPage() {
  const { items, error, run } = useList(users.list);
  const [newUser, setNewUser] = useState(emptyUser);
  const [editing, setEditing] = useState<User | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const { name, email, role } = newUser;
    if (await run(() => users.create({ name: name.trim(), email: email.trim(), role }))) setNewUser(emptyUser);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const { id, name, email, role } = editing;
    if (await run(() => users.update(id, { name: name.trim(), email: email.trim(), role }))) setEditing(null);
  }

  function remove(user: User) {
    if (confirm(`Delete user "${user.name}"?`)) run(() => users.remove(user.id));
  }

  return (
    <>
      <PageHeader title="Users" count={items?.length} error={error} />

      <form onSubmit={create} className="card flex flex-wrap items-end gap-3 p-4">
        <label className="label flex-1">
          Name
          <input
            className="input"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            placeholder="New user name"
          />
        </label>
        <label className="label flex-1">
          Email
          <input
            className="input"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            placeholder="name@example.com"
          />
        </label>
        <label className="label w-32">
          Role
          <RoleSelect value={newUser.role} onChange={(role) => setNewUser({ ...newUser, role })} />
        </label>
        <button className="btn btn-primary" disabled={!isComplete(newUser)}>
          Add user
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Id</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items?.map((user) =>
              editing?.id === user.id ? (
                <tr key={user.id}>
                  <td className="font-mono text-muted">{user.id}</td>
                  <td colSpan={5}>
                    <form onSubmit={save} className="flex gap-2">
                      <input
                        className="input flex-1"
                        aria-label="Name"
                        autoFocus
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      />
                      <input
                        className="input flex-1"
                        type="email"
                        aria-label="Email"
                        value={editing.email}
                        onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                      />
                      <RoleSelect value={editing.role} onChange={(role) => setEditing({ ...editing, role })} />
                      <button className="btn btn-primary btn-small" disabled={!isComplete(editing)}>
                        Save
                      </button>
                      <button type="button" className="btn btn-small" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={user.id}>
                  <td className="font-mono text-muted">{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email || <span className="text-muted">None</span>}</td>
                  <td>
                    <span className="badge capitalize">{user.role}</span>
                  </td>
                  <Timestamp created={user.created} updated={user.updated} />
                  <td>
                    <div className="flex justify-end gap-2">
                      <button className="btn btn-small" onClick={() => setEditing(user)}>
                        Edit
                      </button>
                      <button className="btn btn-small btn-danger" onClick={() => remove(user)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
            {items?.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
