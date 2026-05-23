CREATE TYPE public."TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');
CREATE TYPE public."TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE public."TaskType" AS ENUM ('FEATURE', 'BUG', 'CHORE', 'REFACTOR', 'RESEARCH');

CREATE TABLE public."Project" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."Sprint" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "goal" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."Task" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sprintId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" public."TaskType" NOT NULL DEFAULT 'FEATURE',
  "status" public."TaskStatus" NOT NULL DEFAULT 'TODO',
  "priority" public."TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "deadline" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Project_userId_idx" ON public."Project"("userId");
CREATE INDEX "Project_isArchived_idx" ON public."Project"("isArchived");
CREATE INDEX "Sprint_userId_idx" ON public."Sprint"("userId");
CREATE INDEX "Sprint_startDate_idx" ON public."Sprint"("startDate");
CREATE INDEX "Sprint_endDate_idx" ON public."Sprint"("endDate");
CREATE INDEX "Task_userId_idx" ON public."Task"("userId");
CREATE INDEX "Task_projectId_idx" ON public."Task"("projectId");
CREATE INDEX "Task_sprintId_idx" ON public."Task"("sprintId");
CREATE INDEX "Task_status_idx" ON public."Task"("status");
CREATE INDEX "Task_priority_idx" ON public."Task"("priority");
CREATE INDEX "Task_deadline_idx" ON public."Task"("deadline");

ALTER TABLE public."Task"
  ADD CONSTRAINT "Task_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES public."Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."Task"
  ADD CONSTRAINT "Task_sprintId_fkey"
  FOREIGN KEY ("sprintId") REFERENCES public."Sprint"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
