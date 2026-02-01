import { useOfficialRulesets } from '../modules/rulesets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Loader2 } from 'lucide-react';

export function RulesetsTest() {
  const { rulesets, loading, error } = useOfficialRulesets();

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Fehler beim Laden</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="mb-2">Verfügbare Regelwerke</h1>
        <p className="text-muted-foreground mb-6">
          {rulesets.length} offizielle Regelwerke gefunden
        </p>

        <div className="grid gap-4">
          {rulesets.map((ruleset) => (
            <Card key={ruleset.id}>
              <CardHeader>
                <CardTitle>{ruleset.name}</CardTitle>
                <CardDescription>
                  {ruleset.description || 'Kein Beschreibung'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Version:</span> {ruleset.version || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Attribute:</span>{' '}
                    {ruleset.attributes_config.primary.join(', ')}
                  </div>
                  <div>
                    <span className="font-medium">Klassen:</span>{' '}
                    {ruleset.classes_config.map(c => c.name).join(', ')}
                  </div>
                  <div>
                    <span className="font-medium">Völker:</span>{' '}
                    {ruleset.races_config.map(r => r.name).join(', ')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
