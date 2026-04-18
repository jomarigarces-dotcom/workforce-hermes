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
    writer: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const notes = [...(task.notes || [])];
    notes.push({
      text: args.noteText,
      date: new Date().toLocaleString("en-US", {
        timeZone: "America/New_York",
        year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
      }),
      writer: args.writer,
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

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const getFeatureImageUrls = query({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    const urls = [];
    for (const id of args.storageIds) {
      urls.push(await ctx.storage.getUrl(id));
    }
    return urls;
  },
});

export const addTaskFeature = mutation({
  args: {
    taskId: v.id("tasks"),
    feature: v.object({
      id: v.string(),
      name: v.string(),
      description: v.string(),
      status: v.string(),
      suggestedBy: v.optional(v.string()),
      imageStorageIds: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    console.log("Adding feature to task:", args.taskId, args.feature);
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    const features = [...(task.features || [])];
    features.push(args.feature);
    await ctx.db.patch(args.taskId, { features, lastUpdated: Date.now() });
  },
});

export const updateFeatureStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    featureId: v.string(),
    status: v.string(),
    writer: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    const features = [...(task.features || [])];
    const featIndex = features.findIndex(f => f.id === args.featureId);
    if (featIndex === -1) return;
    
    if (features[featIndex].status === args.status) return;

    features[featIndex].status = args.status;
    const updates: any = { features, lastUpdated: Date.now() };

    if (args.status === "completed") {
      const notes = [...(task.notes || [])];
      notes.push({
        text: `Feature '${features[featIndex].name}' has been completed.`,
        date: new Date().toLocaleString(),
        writer: args.writer,
      });
      updates.notes = notes;
    }
    
    await ctx.db.patch(args.taskId, updates);
  },
});

export const updateTaskFeature = mutation({
  args: {
    taskId: v.id("tasks"),
    featureId: v.string(),
    updates: v.object({
      name: v.string(),
      description: v.string(),
      imageStorageIds: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const features = [...(task.features || [])];
    const featIndex = features.findIndex(f => f.id === args.featureId);
    if (featIndex === -1) return;

    features[featIndex] = {
      ...features[featIndex],
      ...args.updates,
    };

    await ctx.db.patch(args.taskId, { features, lastUpdated: Date.now() });
  },
});

export const deleteTaskFeature = mutation({
  args: {
    taskId: v.id("tasks"),
    featureId: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const features = (task.features || []).filter(f => f.id !== args.featureId);
    await ctx.db.patch(args.taskId, { features, lastUpdated: Date.now() });
  },
});
