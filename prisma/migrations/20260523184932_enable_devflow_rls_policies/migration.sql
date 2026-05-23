ALTER TABLE public."Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Sprint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Task" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owner access" ON public."Project"
  FOR ALL
  TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "Sprint owner access" ON public."Sprint"
  FOR ALL
  TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "Task owner access" ON public."Task"
  FOR ALL
  TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);
