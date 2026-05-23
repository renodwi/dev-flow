import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/supabase-server";
import { TaskPriority, TaskStatus, TaskType } from "@prisma/client";

const projectSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  description: z.string().optional().default(""),
  color: z.string().optional().default("#2563eb"),
  isArchived: z.boolean().optional().default(false),
});

const sprintSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1),
    goal: z.string().optional().default(""),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
  })
  .refine((value) => value.endDate >= value.startDate, "End date cannot be earlier than start date");

const taskSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1),
  sprintId: z.string().nullable().optional(),
  title: z.string().trim().min(1),
  description: z.string().optional().default(""),
  type: z.enum(TaskType),
  status: z.enum(TaskStatus),
  priority: z.enum(TaskPriority),
  deadline: z.string().nullable().optional(),
});

const mutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("upsertProject"), payload: projectSchema }),
  z.object({ action: z.literal("deleteProject"), id: z.string() }),
  z.object({ action: z.literal("upsertSprint"), payload: sprintSchema }),
  z.object({ action: z.literal("deleteSprint"), id: z.string() }),
  z.object({ action: z.literal("upsertTask"), payload: taskSchema }),
  z.object({ action: z.literal("deleteTask"), id: z.string() }),
]);

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [projects, sprints, tasks] = await Promise.all([
    prisma.project.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.sprint.findMany({ where: { userId }, orderBy: { startDate: "desc" } }),
    prisma.task.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
  ]);

  return NextResponse.json({ users: [], projects, sprints, tasks });
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = mutationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const result = await mutate(userId, parsed.data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Mutation failed" }, { status: 400 });
  }
}

async function mutate(userId: string, mutation: z.infer<typeof mutationSchema>) {
  if (mutation.action === "upsertProject") {
    const { id, ...payload } = mutation.payload;
    if (!id) return prisma.project.create({ data: { ...payload, userId } });
    await assertOwnsProject(userId, id);
    return prisma.project.update({ where: { id }, data: payload });
  }

  if (mutation.action === "deleteProject") {
    return prisma.project.deleteMany({ where: { id: mutation.id, userId } });
  }

  if (mutation.action === "upsertSprint") {
    const { id, startDate, endDate, ...payload } = mutation.payload;
    const data = { ...payload, startDate: new Date(startDate), endDate: new Date(endDate) };
    if (!id) return prisma.sprint.create({ data: { ...data, userId } });
    await assertOwnsSprint(userId, id);
    return prisma.sprint.update({ where: { id }, data });
  }

  if (mutation.action === "deleteSprint") {
    await prisma.task.updateMany({ where: { sprintId: mutation.id, userId }, data: { sprintId: null } });
    return prisma.sprint.deleteMany({ where: { id: mutation.id, userId } });
  }

  if (mutation.action === "upsertTask") {
    const { id, projectId, sprintId, deadline, ...payload } = mutation.payload;
    await assertOwnsProject(userId, projectId);
    if (sprintId) await assertOwnsSprint(userId, sprintId);
    const data = {
      ...payload,
      projectId,
      sprintId: sprintId || null,
      deadline: deadline ? new Date(deadline) : null,
    };
    if (!id) return prisma.task.create({ data: { ...data, userId } });
    await assertOwnsTask(userId, id);
    return prisma.task.update({ where: { id }, data });
  }

  return prisma.task.deleteMany({ where: { id: mutation.id, userId } });
}

async function assertOwnsProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
  if (!project) throw new Error("Project not found");
}

async function assertOwnsSprint(userId: string, sprintId: string) {
  const sprint = await prisma.sprint.findFirst({ where: { id: sprintId, userId }, select: { id: true } });
  if (!sprint) throw new Error("Sprint not found");
}

async function assertOwnsTask(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId }, select: { id: true } });
  if (!task) throw new Error("Task not found");
}
