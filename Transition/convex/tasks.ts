import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// --- QUERIES ---

export const getTasks = query({
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});

export const getProjectStats = query({
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();

    interface WorkloadInfo {
      name: string;
      active: number;
      pending: number;
    }

    const stats: Record<string, any> = {
      todo: 0,
      pending: 0,
      development: 0,
      testing: 0,
      done: 0,
      scrapyard: 0,
      overallCompletion: 0,
      staffWorkload: [] as WorkloadInfo[],
    };

    if (tasks.length === 0) return stats;

    let totalProg = 0;
    const workloadMap: Record<string, WorkloadInfo> = {};

    tasks.forEach((t) => {
      const status = (t.status || "").toLowerCase();
      if (status in stats && typeof stats[status] === "number") {
        stats[status]++;
      } else if (status === "inprogress") {
        stats.development++;
      }

      const milestones = t.milestones || [];
      const totalM = milestones.length > 0 ? milestones.length : 10;
      const prog = totalM > 0 ? (t.completedMilestones || 0) / totalM : 0;
      totalProg += prog;

      const isActive = status === "development" || status === "inprogress";
      const isPending = status === "pending";
      if (isActive || isPending) {
        const assignees = (t.assignee || "")
          .split(",")
          .map((n) => n.trim())
          .filter((n) => n);
        assignees.forEach((name) => {
          if (!workloadMap[name])
            workloadMap[name] = { name, active: 0, pending: 0 };
          if (isActive) workloadMap[name].active++;
          if (isPending) workloadMap[name].pending++;
        });
      }
    });

    stats.overallCompletion = Math.round((totalProg / tasks.length) * 100);
    stats.staffWorkload = (Object.values(workloadMap) as WorkloadInfo[]).sort(
      (a, b) => b.active + b.pending - (a.active + a.pending)
    );

    return stats;
  },
});

// --- MUTATIONS ---

export const addTask = mutation({
  args: {
    title: v.string(),
    assignee: v.string(),
    description: v.optional(v.string()),
    milestones: v.array(
      v.object({
        name: v.string(),
        days: v.number(),
        completed: v.optional(v.boolean()),
        completedAt: v.optional(v.string()),
      })
    ),
    startDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("tasks", {
      title: args.title,
      status: "todo",
      assignee: args.assignee,
      description: args.description || "",
      milestones: args.milestones,
      completedMilestones: 0,
      notes: [],
      startDate: args.startDate,
      lastUpdated: Date.now(),
    });
  },
});

export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      status: args.newStatus,
      lastUpdated: Date.now(),
    });
  },
});

export const updateTaskMilestones = mutation({
  args: {
    taskId: v.id("tasks"),
    milestones: v.array(
      v.object({
        name: v.string(),
        days: v.number(),
        completed: v.optional(v.boolean()),
        completedAt: v.optional(v.string()),
      })
    ),
    completedCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      milestones: args.milestones,
      completedMilestones: args.completedCount,
      lastUpdated: Date.now(),
    });
  },
});

export const addNoteToTask = mutation({
  args: {
    taskId: v.id("tasks"),
    noteText: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const notes = [...(task.notes || [])];
    notes.push({
      text: args.noteText,
      date: new Date().toLocaleString(),
    });

    await ctx.db.patch(args.taskId, {
      notes,
      lastUpdated: Date.now(),
    });

    return notes;
  },
});

export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.taskId);
  },
});

export const updateTaskDetails = mutation({
  args: {
    taskId: v.id("tasks"),
    newTitle: v.string(),
    newDescription: v.optional(v.string()),
    newAssignee: v.string(),
    newMilestones: v.array(
      v.object({
        name: v.string(),
        days: v.number(),
        completed: v.optional(v.boolean()),
        completedAt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const completedCount = args.newMilestones.filter(
      (m) => m.completed
    ).length;

    await ctx.db.patch(args.taskId, {
      title: args.newTitle,
      description: args.newDescription || "",
      assignee: args.newAssignee,
      milestones: args.newMilestones,
      completedMilestones: completedCount,
      lastUpdated: Date.now(),
    });
  },
});

export const updateProjectLink = mutation({
  args: {
    taskId: v.id("tasks"),
    projectLink: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    await ctx.db.patch(args.taskId, {
      projectLink: args.projectLink,
      lastUpdated: Date.now(),
    });
  },
});

export const updateAdminCredentials = mutation({
  args: {
    taskId: v.id("tasks"),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    await ctx.db.patch(args.taskId, {
      adminCredentials: {
        email: args.email,
        password: args.password,
      },
      lastUpdated: Date.now(),
    });
  },
});
