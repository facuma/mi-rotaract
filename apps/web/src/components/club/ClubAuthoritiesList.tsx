'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Membership = {
  title: string | null;
  isPresident: boolean;
  user: { id: string; fullName: string; email: string };
};

export function ClubAuthoritiesList({
  memberships,
}: {
  memberships: Membership[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Autoridades actuales</CardTitle>
      </CardHeader>
      <CardContent>
        {memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin autoridades cargadas.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {memberships.map((m) => (
              <li key={m.user.id}>
                <span className="font-medium">{m.user.fullName}</span>
                {m.isPresident && (
                  <span className="ml-1 text-primary">(Presidente)</span>
                )}
                {m.title && !m.isPresident && (
                  <span className="text-muted-foreground"> — {m.title}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
