'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { usersApi, clubsApi, type AdminUser, type Club } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { MoreHorizontal, Plus, Trash2, RotateCcw, Pencil, Search } from 'lucide-react';

// ─── tipos ────────────────────────────────────────────────────────────────────

type RoleValue = 'PARTICIPANT' | 'SECRETARY' | 'RDR' | 'COMPANY' | 'SUPERADMIN';

const ROLE_LABELS: Record<string, string> = {
  PARTICIPANT: 'Participante',
  SECRETARY: 'Secretario',
  PRESIDENT: 'Presidente',
  RDR: 'RDR',
  COMPANY: 'Empresa',
  SUPERADMIN: 'Superadmin',
};

const ROLE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PARTICIPANT: 'secondary',
  PRESIDENT: 'default',
  SECRETARY: 'default',
  RDR: 'default',
  COMPANY: 'outline',
  SUPERADMIN: 'destructive',
};

const ASSIGNABLE_ROLES: { value: RoleValue; label: string }[] = [
  { value: 'PARTICIPANT', label: 'Participante' },
  { value: 'SECRETARY', label: 'Secretario Distrital' },
  { value: 'RDR', label: 'RDR' },
  { value: 'COMPANY', label: 'Empresa' },
  { value: 'SUPERADMIN', label: 'Superadmin' },
];

const mapDbRoleToFrontend = (role: string): string => {
  if (role === 'USER') return 'PARTICIPANT';
  if (role === 'DISTRICT_SECRETARY') return 'SECRETARY';
  if (role === 'DISTRICT_RDR') return 'RDR';
  return role;
};

// ─── EditUserDialog ───────────────────────────────────────────────────────────

function EditUserDialog({
  user,
  open,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: Pick<AdminUser, 'id' | 'fullName' | 'email' | 'role' | 'isActive'>) => void;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<RoleValue>(mapDbRoleToFrontend(user.role) as RoleValue);
  const [isActive, setIsActive] = useState(user.isActive);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFullName(user.fullName);
    setEmail(user.email);
    setRole(mapDbRoleToFrontend(user.role) as RoleValue);
    setIsActive(user.isActive);
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await usersApi.update(user.id, { fullName, email, role, isActive });
      toast.success('Usuario actualizado');
      onSaved(updated);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nombre completo</Label>
            <Input
              id="edit-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as RoleValue)}>
              <SelectTrigger id="edit-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              El rol PRESIDENTE es virtual y se asigna automáticamente mediante la membresía.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Usuario activo</p>
              <p className="text-xs text-muted-foreground">
                Los usuarios inactivos no pueden iniciar sesión.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── MembershipsDialog ────────────────────────────────────────────────────────

function MembershipsDialog({
  user,
  clubs,
  open,
  onClose,
  onChanged,
}: {
  user: AdminUser;
  clubs: Club[];
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [memberships, setMemberships] = useState(user.memberships);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    setMemberships(user.memberships);
  }, [user.memberships]);

  const availableClubs = clubs.filter(
    (c) => !memberships.some((m) => m.clubId === c.id),
  );

  const handleAdd = async () => {
    if (!selectedClubId) return;
    setAdding(true);
    try {
      const newM = await usersApi.addMembership(user.id, selectedClubId);
      setMemberships((prev) => [...prev, newM]);
      setSelectedClubId('');
      toast.success('Membresía agregada');
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al agregar');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (clubId: string) => {
    setRemovingId(clubId);
    try {
      await usersApi.removeMembership(user.id, clubId);
      setMemberships((prev) => prev.filter((m) => m.clubId !== clubId));
      toast.success('Membresía eliminada');
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Membresías — {user.fullName}</DialogTitle>
          <DialogDescription>
            Clubs a los que pertenece este usuario actualmente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {memberships.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Sin membresías activas.
            </p>
          ) : (
            <div className="space-y-2">
              {memberships.map((m) => (
                <div
                  key={m.clubId}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{m.club.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.club.code}
                      {m.isPresident && ' · Presidente'}
                      {m.title && ` · ${m.title}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    disabled={removingId === m.clubId}
                    onClick={() => handleRemove(m.clubId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {availableClubs.length > 0 && (
            <div className="flex gap-2 pt-1">
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Agregar a un club…" />
                </SelectTrigger>
                <SelectContent>
                  {availableClubs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                disabled={!selectedClubId || adding}
                onClick={handleAdd}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ResetPasswordDialog ──────────────────────────────────────────────────────

function ResetPasswordDialog({
  user,
  open,
  onClose,
}: {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await usersApi.resetPassword(user.id);
      toast.success(`Se envió el email de restablecimiento a ${user.email}`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al enviar el email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Resetear contraseña</DialogTitle>
          <DialogDescription>
            Se enviará un email de restablecimiento a{' '}
            <span className="font-medium">{user?.email}</span>. El enlace expirará en 7 días.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── página principal ─────────────────────────────────────────────────────────

const getEffectiveRole = (u: AdminUser): string => {
  const mappedRole = mapDbRoleToFrontend(u.role);
  if (mappedRole === 'PARTICIPANT' && u.memberships?.some((m) => m.isPresident)) {
    return 'PRESIDENT';
  }
  return mappedRole;
};

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [membershipsUser, setMembershipsUser] = useState<AdminUser | null>(null);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([usersApi.list(), clubsApi.list(true)])
      .then(([u, c]) => {
        setUsers(u);
        setClubs(c);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const effectiveRole = getEffectiveRole(u);
      const matchRole = roleFilter === 'ALL' || effectiveRole === roleFilter;
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' ? u.isActive : !u.isActive);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleUserSaved = (
    updated: Pick<AdminUser, 'id' | 'fullName' | 'email' | 'role' | 'isActive'>,
  ) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)),
    );
  };

  const handleMembershipChanged = () => {
    usersApi.list().then(setUsers).catch(() => null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Usuarios</CardTitle>
              <CardDescription>
                {users.length} usuarios en total · {users.filter((u) => u.isActive).length} activos
              </CardDescription>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los roles</SelectItem>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
                <SelectItem value="PRESIDENT">Presidente</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="ACTIVE">Activos</SelectItem>
                <SelectItem value="INACTIVE">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No se encontraron usuarios con los filtros aplicados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="hidden md:table-cell">Clubs</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium leading-none">{u.fullName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={ROLE_VARIANT[getEffectiveRole(u)] ?? 'secondary'}>
                        {ROLE_LABELS[getEffectiveRole(u)] ?? u.role}
                      </Badge>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      {!u.memberships || u.memberships.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.memberships.map((m) => (
                            <Badge key={m.clubId} variant="outline" className="text-xs">
                              {m.club?.code || '—'}
                              {m.isPresident && ' ★'}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant={u.isActive ? 'default' : 'secondary'}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Acciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditUser(u)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMembershipsUser(u)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Membresías
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setResetUser(u)}
                            className="text-destructive focus:text-destructive"
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Resetear contraseña
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editUser && (
        <EditUserDialog
          user={editUser}
          open
          onClose={() => setEditUser(null)}
          onSaved={handleUserSaved}
        />
      )}

      {membershipsUser && (
        <MembershipsDialog
          user={membershipsUser}
          clubs={clubs}
          open
          onClose={() => setMembershipsUser(null)}
          onChanged={handleMembershipChanged}
        />
      )}

      <ResetPasswordDialog
        user={resetUser}
        open={!!resetUser}
        onClose={() => setResetUser(null)}
      />
    </>
  );
}
