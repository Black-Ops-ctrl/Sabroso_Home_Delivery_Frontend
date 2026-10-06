import { useState, useEffect } from "react";
import Modal from "../../components/common/Modal";
import ConfirmDelete from "../../components/common/ConfirmDelete";
import Icon from "../../config/icons";
import { pad } from "../../config/format";
import Select from "../../components/common/Select";
import { usePaged } from "../../components/common/Pager";
import { usePageSearch } from "../../context/SearchContext";
import { useLookups } from "../../context/LookupsContext";
import { onlyLetters, codeText } from "../../config/inputs";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usersApi, rolesApi } from "../../services/api";
import { PERM_MODULES } from "../../config/permissions";

const fmtLogin = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Never";

const MOD = "Users & Roles";
const ADMIN_ROLE = "Administrator";
const isAdminRole = (r) => !!r && r.name === ADMIN_ROLE;
const isAdminUser = (u) => !!u && String(u.username || "").toLowerCase() === "admin";


const permsToEditable = (perms = {}) => {
  const out = {};
  PERM_MODULES.forEach((m) => {
    const granted = Array.isArray(perms[m.name]) ? perms[m.name] : [];
    out[m.name] = m.actions.filter((a) => granted.includes(a));
  });
  return out;
};

const permKey = (edit = {}) =>
  PERM_MODULES.map((m) => (edit[m.name] || []).slice().sort().join(",")).join("|");

export default function Security() {
  const toast = useToast();
  const { can, refreshUser } = useAuth();
  const lk = useLookups();
  const setFormErr = (m) => {
    if (m) toast.error(m);
  };
  const { data, loading, error, reload } = useApi(
    () => Promise.all([usersApi.list(), rolesApi.list()]).then(([users, roles]) => ({ users, roles })),
    [],
    ["users", "roles"]
  );

  const [active, setActive] = useState("users");
  const [userForm, setUserFormRaw] = useState(null);
  const setUserForm = setUserFormRaw;
  const [userDel, setUserDel] = useState(null);
  const [roleForm, setRoleFormRaw] = useState(null);
  const setRoleForm = setRoleFormRaw;
  const [roleDel, setRoleDel] = useState(null);
  const [userView, setUserView] = useState(null);
  const [roleView, setRoleView] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  const [activeRoleId, setActiveRoleId] = useState(null);
  const [editPerms, setEditPerms] = useState({});
  const [savedKey, setSavedKey] = useState("");

  const users = data?.users || [];
  const roles = data?.roles || [];
  const search = usePageSearch(active === "users" ? "users" : active === "roles" ? "roles" : null);
  const text = active === "permissions" ? "" : search.query.toLowerCase();
  const shownUsers = text ? users.filter((u) => `${u.name} ${u.username} ${u.role_name || ""}`.toLowerCase().includes(text)) : users;
  const shownRoles = text ? roles.filter((r) => String(r.name).toLowerCase().includes(text)) : roles;
  const userPage = usePaged(shownUsers, `${active}|${text}`);
  const rolePage = usePaged(shownRoles, `${active}|${text}`);

  useEffect(() => {
    if (!roles.length) return;
    const stillThere = roles.some((r) => r.id === activeRoleId);
    if (!stillThere) {
      const first = roles[0];
      const ed = permsToEditable(first.perms);
      setActiveRoleId(first.id);
      setEditPerms(ed);
      setSavedKey(permKey(ed));
    }
  }, [roles]);

  const activeRole = roles.find((r) => r.id === activeRoleId) || null;
  const lockedRole = isAdminRole(activeRole);
  const dirty = !lockedRole && permKey(editPerms) !== savedKey;

  const selectRole = (id) => {
    const r = roles.find((x) => x.id === id);
    if (!r) return;
    const ed = permsToEditable(r.perms);
    setActiveRoleId(id);
    setEditPerms(ed);
    setSavedKey(permKey(ed));
  };

  const togglePerm = (moduleName, action) => {
    setEditPerms((prev) => {
      const cur = prev[moduleName] || [];
      const has = cur.includes(action);
      return {
        ...prev,
        [moduleName]: has
          ? cur.filter((a) => a !== action)
          : [...cur, action],
      };
    });
  };

  const savePerms = async () => {
    if (!activeRole) return;
    setBusy(true);
    try {
      const perms = {};
      PERM_MODULES.forEach((m) => {
        perms[m.name] = editPerms[m.name] || [];
      });
      await rolesApi.update(activeRole.id, { name: activeRole.name, perms });
      setSavedKey(permKey(editPerms));
      await reload();
      await refreshUser();
      toast.success("Permissions saved");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openNewUser = () =>
    setUserForm({
      mode: "new",
      name: "",
      username: "",
      password: "",
      role_id: "",
      status: lk.list("user_status")[0]?.code || "",
    });
  const openEditUser = (u) =>
    setUserForm({
      mode: "edit",
      id: u.id,
      name: u.name || "",
      username: u.username || "",
      password: u.password || "",
      role_id: u.role_id != null ? String(u.role_id) : "",
      status: u.status || "ACTIVE",
      locked: isAdminUser(u),
    });
  const setU = (k, v) => setUserForm((f) => ({ ...f, [k]: v }));

  const saveUser = async () => {
    const err = !userForm.name.trim()
      ? "Full name is required"
      : !userForm.username.trim()
      ? "Username is required"
      : !userForm.password
      ? "Password is required"
      : !userForm.role_id
      ? "Please select a role"
      : !userForm.status
      ? "Please select a status"
      : null;
    if (err) {
      setFormErr(err);
      return;
    }
    const body = {
      name: userForm.name.trim(),
      username: userForm.username.trim(),
      password: userForm.password || null,
      role_id: Number(userForm.role_id),
      status: userForm.status,
    };
    setBusy(true);
    try {
      if (userForm.mode === "edit") {
        await usersApi.update(userForm.id, body);
        toast.success("User updated");
      } else {
        await usersApi.create(body);
        toast.success("User added");
      }
      setUserForm(null);
      reload();
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doDeleteUser = async () => {
    setBusy(true);
    try {
      await usersApi.remove(userDel.id);
      toast.success("User deleted");
      setUserDel(null);
      await reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openNewRole = () => setRoleForm({ mode: "new", name: "", perms: {} });
  const openEditRole = (r) =>
    setRoleForm({ mode: "edit", id: r.id, name: r.name || "", perms: r.perms || {} });
  const setR = (k, v) => setRoleForm((f) => ({ ...f, [k]: v }));

  const saveRole = async () => {
    if (!roleForm.name.trim()) {
      setFormErr("Role name is required");
      return;
    }
    setBusy(true);
    try {
      if (roleForm.mode === "edit") {
        await rolesApi.update(roleForm.id, {
          name: roleForm.name.trim(),
          perms: roleForm.perms || {},
        });
        toast.success("Role updated");
      } else {
        await rolesApi.create({ name: roleForm.name.trim(), perms: {} });
        toast.success("Role added");
      }
      setRoleForm(null);
      reload();
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doDeleteRole = async () => {
    setBusy(true);
    try {
      await rolesApi.remove(roleDel.id);
      toast.success("Role deleted");
      setRoleDel(null);
      await reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <>
        <div className="ord-head">
          <h1>Security</h1>
        </div>
        <div className="empty" style={{ padding: 40 }}>
          Loading…
        </div>
      </>
    );

  if (error)
    return (
      <>
        <div className="ord-head">
          <h1>Security</h1>
        </div>
        <div className="empty" style={{ padding: 40 }}>
          {error}
        </div>
      </>
    );

  const heads = {
    users: { h1: "Users", add: "Add user", onAdd: openNewUser },
    roles: { h1: "Roles", add: "Add role", onAdd: openNewRole },
    permissions: { h1: "Permissions" },
  };
  const head = heads[active];

  return (
    <>
      <div className="ord-head">
        <h1>{head.h1}</h1>
        <div className="ord-head__actions">
          {active === "users" && can(MOD, "add") && (
            <button className="btn" onClick={head.onAdd}>
              <Icon name="plus" />
              <span>{head.add}</span>
            </button>
          )}
          {active === "roles" && can(MOD, "add") && (
            <button className="btn" onClick={head.onAdd}>
              <Icon name="plus" />
              <span>{head.add}</span>
            </button>
          )}
          {active === "permissions" && dirty && can(MOD, "permissions") && (
            <button className="btn btn--save" onClick={savePerms} disabled={busy}>
              <Icon name="check" />
              <span>Save permissions</span>
            </button>
          )}
        </div>
      </div>

      <div className="tabs cbtabs-row" style={{ marginBottom: 18 }}>
        <button
          className={"tab" + (active === "users" ? " is-active" : "")}
          onClick={() => setActive("users")}
        >
          Users <span className="tab__count">({users.length})</span>
        </button>
        <button
          className={"tab" + (active === "roles" ? " is-active" : "")}
          onClick={() => setActive("roles")}
        >
          Roles <span className="tab__count">({roles.length})</span>
        </button>
        <button
          className={"tab" + (active === "permissions" ? " is-active" : "")}
          onClick={() => setActive("permissions")}
        >
          Permissions
        </button>
        {active !== "permissions" && (
          <div className="cbtabs-right">
            {search.query && (
              <span className="search-chip">"{search.query}"<button onClick={search.clear} aria-label="Clear search"><Icon name="x" /></button></span>
            )}
            <button className="iconbtn iconbtn--search" title="Search (Ctrl+F)" onClick={search.open}><Icon name="search" /></button>
          </div>
        )}
      </div>

      {active === "users" && (
        <div className="tablewrap cb-wrap">
          <table className="ord-table cb-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {userPage.rows.length ? (
                userPage.rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="id-cell">USR-{pad(u.id)}</span>
                    </td>
                    <td>
                      <span className="strong">{u.name}</span>
                    </td>
                    <td className="strong">{u.username}</td>
                    <td>
                      <span className="badge b-plum">{u.role_name}</span>
                    </td>
                    <td>
                      <span
                        className={
                          "badge " + (u.status === "ACTIVE" ? "b-green" : "b-red")
                        }
                      >
                        {lk.label("user_status", u.status)}
                      </span>
                    </td>
                    <td className="sub">{fmtLogin(u.last_login)}</td>
                    <td>
                      <div className="actions">
                        <button
                          className="iconbtn view"
                          title="View"
                          aria-label="View user"
                          onClick={() => {
                            setShowPass(false);
                            setUserView(u);
                          }}
                        >
                          <Icon name="eye" />
                        </button>
                        {can(MOD, "edit") && (
                          <button
                            className="iconbtn edit"
                            title="Edit"
                            aria-label="Edit user"
                            onClick={() => openEditUser(u)}
                          >
                            <Icon name="edit" />
                          </button>
                        )}
                        {can(MOD, "delete") && !isAdminUser(u) && (
                          <button
                            className="iconbtn del"
                            title="Delete"
                            aria-label="Delete user"
                            onClick={() => setUserDel(u)}
                          >
                            <Icon name="trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty">
                    {text ? "No user matches your search" : "No users yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {active === "users" && userPage.pager}

      {active === "roles" && (
        <div className="tablewrap cb-wrap">
          <table className="ord-table cb-table">
            <thead>
              <tr>
                <th>Role ID</th>
                <th>Role Name</th>
                <th>Users</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rolePage.rows.length ? (
                rolePage.rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="id-cell">ROL-{pad(r.id)}</span>
                    </td>
                    <td className="strong" style={{ color: "var(--ink)" }}>
                      {r.name}
                    </td>
                    <td className="strong">{r.user_count}</td>
                    <td>
                      <div className="actions">
                        <button
                          className="iconbtn view"
                          title="View"
                          aria-label="View role"
                          onClick={() => setRoleView(r)}
                        >
                          <Icon name="eye" />
                        </button>
                        {can(MOD, "edit") && !isAdminRole(r) && (
                          <button
                            className="iconbtn edit"
                            title="Edit"
                            aria-label="Edit role"
                            onClick={() => openEditRole(r)}
                          >
                            <Icon name="edit" />
                          </button>
                        )}
                        {can(MOD, "delete") && !isAdminRole(r) && (
                          <button
                            className="iconbtn del"
                            title="Delete"
                            aria-label="Delete role"
                            onClick={() => setRoleDel(r)}
                          >
                            <Icon name="trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty">
                    {text ? "No role matches your search" : "No roles yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {active === "roles" && rolePage.pager}

      {active === "permissions" && (
        <>
          <div
            className="cbtabs-right perm-tabrole"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <span className="rpills__lbl">Role:</span>
            <div style={{ minWidth: 220 }}>
              <Select
                placeholder="Select role"
                searchPlaceholder="Search role"
                value={activeRoleId ?? ""}
                options={roles.map((r) => ({ value: r.id, label: r.name }))}
                onChange={(v) => selectRole(Number(v))}
              />
            </div>
          </div>

          {activeRole ? (
            <div className="permgrid">
              {PERM_MODULES.map((m) => (
                <div className="pcardm" key={m.name}>
                  <div className="pcardm__head">
                    <span>{m.name}</span>
                  </div>
                  <div className="pcardm__body">
                    {m.actions.map((a) => {
                      const granted = lockedRole || (editPerms[m.name] || []).includes(a);
                      return (
                        <div className="prow" key={a}>
                          <span className="pname">{a}</span>
                          <label className={`tsw ${lockedRole ? "tsw--locked" : ""}`}>
                            <input
                              type="checkbox"
                              checked={granted}
                              disabled={lockedRole}
                              onChange={() => togglePerm(m.name, a)}
                            />
                            <span className="tslide"></span>
                            <span className="tstate"></span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: 40 }}>
              No roles yet.
            </div>
          )}
        </>
      )}

      {userForm && (
        <Modal
          title={userForm.mode === "edit" ? "Edit user" : "Add user"}
          submit={userForm.mode === "edit" ? "Save changes" : "Add user"}
          busy={busy}
          onSubmit={saveUser}
          onClose={() => setUserForm(null)}
        >
          <div className="field-row">
            <div className="field">
              <label>Name</label>
              <input
                className="input"
                value={userForm.name}
                onChange={(e) => setU("name", onlyLetters(e.target.value))}
                placeholder="Enter full name"
              />
            </div>
            <div className="field">
              <label>Username</label>
              <input
                className="input"
                value={userForm.username}
                disabled={!!userForm.locked}
                onChange={(e) => setU("username", codeText(e.target.value).replace(/\s/g, ""))}
                placeholder="Enter username"
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Password</label>
              <input
                className="input"
                value={userForm.password}
                onChange={(e) => setU("password", e.target.value)}
                placeholder="Enter password"
              />
            </div>
            <div className="field">
              <label>Role</label>
              <Select
                placeholder="Select role"
                searchPlaceholder="Search role"
                value={userForm.role_id}
                options={roles.map((r) => ({ value: String(r.id), label: r.name }))}
                disabled={!!userForm.locked}
                onChange={(v) => setU("role_id", v)}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Status</label>
              <Select placeholder="Select status" value={userForm.status} options={lk.options("user_status")} disabled={!!userForm.locked} onChange={(v) => setU("status", v)} />
            </div>
          </div>
        </Modal>
      )}

      {userDel && (
        <ConfirmDelete
          what="user"
          note={`${userDel.name} will not be able to sign in any more.`}
          busy={busy}
          onConfirm={doDeleteUser}
          onClose={() => setUserDel(null)}
        />
      )}

      {roleForm && (
        <Modal
          title={roleForm.mode === "edit" ? "Edit role" : "Add role"}
          submit={roleForm.mode === "edit" ? "Save changes" : "Add role"}
          busy={busy}
          onSubmit={saveRole}
          onClose={() => setRoleForm(null)}
        >
          <div className="field">
            <label>Name</label>
            <input
              className="input"
              value={roleForm.name}
              onChange={(e) => setR("name", e.target.value)}
              placeholder="Enter role name"
            />
          </div>
        </Modal>
      )}

      {userView && (
        <Modal hideFoot cls="modal--userview" onClose={() => setUserView(null)}>
          <button className="uv-x" onClick={() => setUserView(null)} aria-label="Close">
            <Icon name="x" />
          </button>
          <div className="uv-wrap">
            <div className="uv-left">
              <h2>{userView.name}</h2>
              <div className="uv-user">@{userView.username}</div>
              <div className="uv-tags">
                <span className="badge">{userView.role_name}</span>
                <span className={"badge " + (userView.status === "ACTIVE" ? "b-green" : "b-red")}>
                  {lk.label("user_status", userView.status)}
                </span>
              </div>
            </div>
            <div className="uv-right">
              <h3 className="uv-h">User details</h3>
              <div className="uv-row">
                <div className="uv-k">User ID</div>
                <div className="uv-v">USR-{pad(userView.id)}</div>
              </div>
              <div className="uv-row">
                <div className="uv-k">Password</div>
                <div className="uv-v">
                  <div className="pass-wrap" style={{ maxWidth: 220 }}>
                    <input
                      type={showPass ? "text" : "password"}
                      className="select pass-input"
                      value={userView.password || ""}
                      readOnly
                    />
                    <button
                      type="button"
                      className="pass-eye"
                      onClick={() => setShowPass((v) => !v)}
                      aria-label="Show or hide password"
                    >
                      <Icon name="eye" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {roleView && (
        <Modal hideFoot cls="modal--userview" onClose={() => setRoleView(null)}>
          <button className="uv-x" onClick={() => setRoleView(null)} aria-label="Close">
            <Icon name="x" />
          </button>
          <div className="uv-wrap">
            <div className="uv-left">
              <h2>{roleView.name}</h2>
            </div>
            <div className="uv-right">
              <h3 className="uv-h">Role details</h3>
              <div className="uv-row">
                <div className="uv-k">Role ID</div>
                <div className="uv-v">ROL-{pad(roleView.id)}</div>
              </div>
              <div className="uv-row">
                <div className="uv-k">Role name</div>
                <div className="uv-v">{roleView.name}</div>
              </div>
              <div className="uv-row">
                <div className="uv-k">Users</div>
                <div className="uv-v">{roleView.user_count}</div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {roleDel && (
        <ConfirmDelete
          what="role"
          note={`The ${roleDel.name} role will be removed.`}
          busy={busy}
          onConfirm={doDeleteRole}
          onClose={() => setRoleDel(null)}
        />
      )}
    </>
  );
}