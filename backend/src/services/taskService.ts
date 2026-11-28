import crypto from "crypto";
import {
  taskRepository,
  type TaskRecord,
  type TaskStageRecord,
} from "../repositories/taskRepository.js";
import { employeeRepository } from "../repositories/employeeRepository.js";
import { locationRepository } from "../repositories/locationRepository.js";
import {
  haversine,
  todayIST,
  isPastCutoff,
  isPlannedBeforeCutoff,
} from "../lib/geo.js";
import { ServiceError } from "../lib/errors.js";
import { config } from "../config.js";
import { photoRepository } from "../repositories/photoRepository.js";

export interface AssignTaskInput {
  employeeId: string;
  locationId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  priority?: "high" | "medium" | "low";
  instructions?: string;
  allowDuplicate?: boolean;
}

export interface PlanTaskInput {
  locationId: string;
  date: string;
  instructions?: string;
}

export interface StageSubmissionInput {
  type: "check_in" | "check_out";
  lat: number;
  lng: number;
  accuracy: number;
  deviceTime: string; // ISO 8601
  idempotencyKey: string;
  photo?: {
    buffer: Buffer;
    mime: string;
  };
}

export const taskService = {
  // 1. Admin Assign Visit
  async assign(input: AssignTaskInput, adminId: string): Promise<TaskRecord> {
    if (!input.employeeId) throw new ServiceError("Select an employee.", 400);
    const emp = await employeeRepository.findById(input.employeeId);
    if (!emp)
      throw new ServiceError("Selected employee no longer exists.", 400);
    if (!emp.active)
      throw new ServiceError("Selected employee is inactive.", 400);

    if (!input.locationId) throw new ServiceError("Select a location.", 400);
    const loc = await locationRepository.findById(input.locationId);
    if (!loc || loc.status !== "active")
      throw new ServiceError("Selected location is not available.", 400);

    if (!input.date) throw new ServiceError("Select a visit date.", 400);
    const today = todayIST();
    if (input.date < today)
      throw new ServiceError("Visit date cannot be in the past.", 400);

    if (input.startTime && !/^\d{2}:\d{2}$/.test(input.startTime)) {
      throw new ServiceError("Enter a valid start time.", 400);
    }
    if (input.endTime && !/^\d{2}:\d{2}$/.test(input.endTime)) {
      throw new ServiceError("Enter a valid end time.", 400);
    }
    if (input.startTime && input.endTime && input.endTime <= input.startTime) {
      throw new ServiceError("End time must be after start time.", 400);
    }

    // Rule 6: Location Conflict check (Only 1 active visit per location per date in database)
    // const conflict = await taskRepository.findConflictingTask(
    //   input.locationId,
    //   input.date,
    // );
    // if (conflict) {
    //   if (conflict.employeeId !== input.employeeId) {
    //     throw new ServiceError(
    //       `This location is already scheduled for ${conflict.employeeName} (${conflict.employeeId}) on ${input.date}. Please select another date or location.`,
    //       409,
    //     );
    //   } else {
    //     throw new ServiceError(
    //       "This employee already has an active visit scheduled for this location on the selected date.",
    //       409,
    //     );
    //   }
    // }

    // Duplicate check for same employee unless allowed
    // if (!input.allowDuplicate) {
    //   const dup = await taskRepository.findDuplicateTask(
    //     input.employeeId,
    //     input.locationId,
    //     input.date,
    //   );
    //   if (dup) {
    //     throw new ServiceError(
    //       "This employee already has a visit to this location on the selected date.",
    //       409,
    //     );
    //   }
    // }

    const id = `VST-${Date.now().toString(36).toUpperCase()}`;

    const created = await taskRepository.create({
      id,
      employeeId: input.employeeId,
      locationId: input.locationId,
      scheduledDate: input.date,
      startTime: input.startTime || "",
      endTime: input.endTime || "",
      priority: input.priority || "medium",
      source: "admin",
      notes: input.instructions?.trim() || "",
      status: "assigned",
      createdBy: adminId,
    });

    // Write audit history
    await taskRepository.createHistory({
      id: `HST-${crypto.randomUUID()}`,
      taskId: id,
      kind: "created",
      by: adminId,
      note: `Visit assigned by Admin to ${emp.name} at ${loc.name}.`,
      after: created,
    });

    return created;
  },

  // 2. Employee Self-Planning
  // async plan(employeeId: string, input: PlanTaskInput): Promise<TaskRecord> {
  // if (!input.date) throw new ServiceError("Select a visit date.", 400);
  // const today = todayIST();
  // if (input.date < today)
  //   throw new ServiceError("Visit date cannot be in the past.", 400);

  // if (!input.locationId) throw new ServiceError("Select a location.", 400);
  // const loc = await locationRepository.findById(input.locationId);
  // if (!loc || loc.status !== "active")
  //   throw new ServiceError("Selected location is not available.", 400);

  // // Rule 6: Location Conflict check
  // // Rule 6: Location Conflict check (Only 1 active visit per location per date in database)
  // const conflict = await taskRepository.findConflictingTask(
  //   input.locationId,
  //   input.date,
  // );
  // if (conflict) {
  //   if (conflict.employeeId !== employeeId) {
  //     throw new ServiceError(
  //       `This location is already scheduled for ${conflict.employeeName} (${conflict.employeeId}) on ${input.date}. Please select another date or location.`,
  //       409,
  //     );
  //   } else {
  //     throw new ServiceError(
  //       "You already have an active visit scheduled for this location on that date.",
  //       409,
  //     );
  //   }
  // }

  // Self-duplicate check
  // const dup = await taskRepository.findDuplicateTask(
  //   employeeId,
  //   input.locationId,
  //   input.date,
  // );
  // if (dup) {
  //   throw new ServiceError(
  //     "You already have a visit to this location on that date.",
  //     409,
  //   );
  // }

  // 2. Employee Self-Planning
  async plan(employeeId: string, input: PlanTaskInput): Promise<TaskRecord> {
    if (!input.date) throw new ServiceError("Select a visit date.", 400);
    const today = todayIST();
    if (input.date < today)
      throw new ServiceError("Visit date cannot be in the past.", 400);

    if (!input.locationId) throw new ServiceError("Select a location.", 400);
    const loc = await locationRepository.findById(input.locationId);
    if (!loc || loc.status !== "active")
      throw new ServiceError("Selected location is not available.", 400);

    // Other employees at this location are allowed.
    // Only block if THIS employee already has a visit there on that date.
    // const dup = await taskRepository.findDuplicateTask(
    //   employeeId,
    //   input.locationId,
    //   input.date,
    // );
    // if (dup) {
    //   throw new ServiceError(
    //     "You already have a visit to this location on that date.",
    //     409,
    //   );
    // }

    const id = `VST-${Date.now().toString(36).toUpperCase()}`;

    const created = await taskRepository.create({
      id,
      employeeId,
      locationId: input.locationId,
      scheduledDate: input.date,
      startTime: "",
      endTime: "",
      priority: "medium",
      source: "self",
      notes: input.instructions?.trim() || "",
      status: "assigned",
      createdBy: employeeId,
    });

    await taskRepository.createHistory({
      id: `HST-${crypto.randomUUID()}`,
      taskId: id,
      kind: "created",
      by: employeeId,
      note: `Visit planned by employee at ${loc.name}.`,
      after: created,
    });

    return created;
  },

  // 3. Employee Edit Self-Planned Visit (Rule 4: 9:00 AM IST cutoff)
  async updatePlan(
    employeeId: string,
    id: string,
    input: PlanTaskInput,
  ): Promise<TaskRecord> {
    const task = await taskRepository.findById(id);
    if (!task || task.employeeId !== employeeId) {
      throw new ServiceError("Visit record not found.", 404);
    }

    if (task.source !== "self" || task.createdBy !== employeeId) {
      throw new ServiceError(
        "This visit was assigned by Admin and cannot be changed.",
        403,
      );
    }

    if (!["assigned", "pending"].includes(task.status)) {
      throw new ServiceError(
        "This visit has already started and can no longer be edited.",
        400,
      );
    }

    // const loc = await locationRepository.findById(input.locationId);
    // if (!loc || loc.status !== "active") {
    //   throw new ServiceError("Selected location is not available.", 400);
    // }

    // const conflict = await taskRepository.findConflictingTask(
    //   input.locationId,
    //   input.date,
    //   id,
    // );
    // if (conflict && conflict.employeeId !== employeeId) {
    //   throw new ServiceError(
    //     `This location is already scheduled for ${conflict.employeeName} (${conflict.employeeId}) on ${input.date}. Please select another date or location.`,
    //     409,
    //   );
    // }

    // const locChanged = input.locationId !== task.locationId;
    const loc = await locationRepository.findById(input.locationId);
    if (!loc || loc.status !== "active") {
      throw new ServiceError("Selected location is not available.", 400);
    }

    // Another employee at this location is now allowed.
    // Only block if THIS employee already has another visit there on that date.
    // const dup = await taskRepository.findDuplicateTask(employeeId, input.locationId, input.date, id);
    // if (dup) {
    //   throw new ServiceError("You already have a visit to this location on that date.", 409);
    // }

    const locChanged = input.locationId !== task.locationId;

    const keepHistory =
      locChanged &&
      isPastCutoff(task.scheduledDate) &&
      isPlannedBeforeCutoff(task.createdAt, task.scheduledDate);

    if (keepHistory) {
      // Archive original to task_history as 'amended'
      await taskRepository.createHistory({
        id: `HST-${crypto.randomUUID()}`,
        taskId: task.id,
        kind: "amended",
        by: employeeId,
        note: `Location changed after 9:00 AM to ${loc.name}.`,
        before: task,
      });

      // Update task with new details
      const updated = await taskRepository.update(id, {
        locationId: input.locationId,
        scheduledDate: input.date,
        notes: input.instructions?.trim() || "",
      });
      return updated!;
    }

    const updated = await taskRepository.update(id, {
      locationId: input.locationId,
      scheduledDate: input.date,
      notes: input.instructions?.trim() || "",
    });
    return updated!;
  },

  // 4. Employee Delete Self-Planned Visit (Rule 4: 9:00 AM IST cutoff)
  // async deleteByEmployee(
  //   employeeId: string,
  //   id: string,
  // ): Promise<"deleted" | "archived"> {
  //   const task = await taskRepository.findById(id);
  //   if (!task || task.employeeId !== employeeId) {
  //     throw new ServiceError("Visit record not found.", 404);
  //   }

  //   if (task.source !== "self" || task.createdBy !== employeeId) {
  //     throw new ServiceError(
  //       "Assigned by Admin — only Admin can delete this visit.",
  //       403,
  //     );
  //   }

  //   if (!["assigned", "pending"].includes(task.status)) {
  //     throw new ServiceError(
  //       "This visit has already started and cannot be deleted.",
  //       400,
  //     );
  //   }

  //   const pastCutoff = isPastCutoff(task.scheduledDate);
  //   if (pastCutoff) {
  //     // Archive as 'cancelled'
  //     await taskRepository.update(id, { status: "cancelled" });
  //     await taskRepository.createHistory({
  //       id: `HST-${crypto.randomUUID()}`,
  //       taskId: id,
  //       kind: "cancelled",
  //       by: employeeId,
  //       note: "Cancelled by employee after 9:00 AM.",
  //       before: task,
  //     });
  //     return "archived";
  //   }

  //   // Before cutoff: hard delete
  //   await taskRepository.delete(id);
  //   return "deleted";
  // },

  // 5. Admin Delete Visit
  async deleteByAdmin(id: string, adminId: string): Promise<void> {
    const task = await taskRepository.findById(id);
    if (!task) return;

    await taskRepository.update(id, { status: "cancelled" });
    await taskRepository.createHistory({
      id: `HST-${crypto.randomUUID()}`,
      taskId: id,
      kind: "cancelled",
      by: adminId,
      note: "Deleted by Admin.",
      before: task,
    });
  },

  // 6. Stage Submission (Check-In / Check-Out)
  async submitStage(
    taskId: string,
    employeeId: string,
    input: StageSubmissionInput,
  ): Promise<{
    status: "accepted" | "rejected";
    stage?: TaskStageRecord;
    distance?: number;
    reason?: string;
  }> {
    // Idempotency check: if this key already processed, return original stored result
    const existingStage = await taskRepository.findStageByIdempotencyKey(
      input.idempotencyKey,
    );
    if (existingStage) {
      return { status: "accepted", stage: existingStage };
    }

    const task = await taskRepository.findById(taskId);
    if (!task) throw new ServiceError("Visit record not found.", 404);
    if (task.employeeId !== employeeId)
      throw new ServiceError("Unauthorized: not your assigned visit.", 403);

    const loc = await locationRepository.findById(task.locationId);
    if (!loc) throw new ServiceError("Location not found.", 404);

    let checkInStage: TaskStageRecord | null = null;
    // Rule 9: Stage order: check-out requires an existing check-in
    if (input.type === "check_out") {
      checkInStage = await taskRepository.findStage(taskId, "check_in");
      if (!checkInStage) {
        throw new ServiceError(
          "Check-in must be completed (or overridden) first.",
          400,
        );
      }
    }

    // Rule 5: Sequential visit locking for check-in
    if (input.type === "check_in") {
      const blocker = await taskRepository.findBlockingVisit(
        employeeId,
        task.scheduledDate,
        taskId,
      );
      if (blocker) {
        throw new ServiceError(
          `Please complete Check-Out at ${blocker.locationName} before starting this visit.`,
          409,
        );
      }
    }

    // Rule 1: Haversine distance computed on the SERVER
    let distanceM = haversine(loc.lat, loc.lng, input.lat, input.lng);
    const radiusM = loc.verificationRadius;

    // For check-out, if inspector verified check-in at site, allow distance to check-in coordinates as well
    // if (input.type === "check_out" && checkInStage?.lat != null && checkInStage?.lng != null) {
    //   const distFromCheckIn = haversine(checkInStage.lat, checkInStage.lng, input.lat, input.lng);
    //   if (distFromCheckIn <= radiusM || distFromCheckIn < distanceM) {
    //     distanceM = distFromCheckIn;
    //   }
    // }

    console.log(
      `📍 [STAGE DISTANCE CHECK] Task: ${taskId}, Type: ${input.type}, Loc: (${loc.lat}, ${loc.lng}), Input: (${input.lat}, ${input.lng}), Distance: ${Math.round(distanceM)}m, Allowed: ${radiusM}m, Accuracy: ${Math.round(input.accuracy)}m`,
    );

    // Rule 3: Reject if GPS accuracy is worse than threshold
    if (input.accuracy > config.gpsMaxAccuracyMeters) {
      const reason = `GPS accuracy of ±${Math.round(input.accuracy)} m is too low (must be within ${config.gpsMaxAccuracyMeters} m).`;
      await taskRepository.createRejectedSubmission({
        id: `REJ-${crypto.randomUUID()}`,
        taskId,
        employeeId,
        stageType: input.type,
        lat: input.lat,
        lng: input.lng,
        accuracyM: input.accuracy,
        distanceM,
        radiusM,
        reason,
        deviceTime: new Date(input.deviceTime),
        photoData: input.photo?.buffer || null,
        photoMime: input.photo?.mime || null,
        photoSha256: input.photo
          ? crypto.createHash("sha256").update(input.photo.buffer).digest("hex")
          : null,
      });

      try {
        await taskRepository.update(taskId, { status: "verification_failed" });
      } catch (updateErr: any) {
        console.warn(
          "Could not update task status to verification_failed:",
          updateErr?.message || updateErr,
        );
      }
      throw new ServiceError(reason, 422);
    }

    // Rule 2: If check-in/out is OUTSIDE radius, reject and store in rejected_submissions
    if (distanceM > radiusM) {
      const reason = `Location outside verification radius: ${Math.round(distanceM)} m from site (allowed: ${radiusM} m).`;
      await taskRepository.createRejectedSubmission({
        id: `REJ-${crypto.randomUUID()}`,
        taskId,
        employeeId,
        stageType: input.type,
        lat: input.lat,
        lng: input.lng,
        accuracyM: input.accuracy,
        distanceM,
        radiusM,
        reason,
        deviceTime: new Date(input.deviceTime),
        photoData: input.photo?.buffer || null,
        photoMime: input.photo?.mime || null,
        photoSha256: input.photo
          ? crypto.createHash("sha256").update(input.photo.buffer).digest("hex")
          : null,
      });

      try {
        await taskRepository.update(taskId, { status: "verification_failed" });
      } catch (updateErr: any) {
        console.warn(
          "Could not update task status to verification_failed:",
          updateErr?.message || updateErr,
        );
      }
      throw new ServiceError(reason, 422);
    }

    // Time difference flag (device time vs server time)
    const deviceDate = new Date(input.deviceTime);
    const serverDate = new Date();
    const diffMinutes =
      Math.abs(serverDate.getTime() - deviceDate.getTime()) / (1000 * 60);
    const timeFlagged = diffMinutes > config.timeDiffFlagThresholdMinutes;

    let photoSha256: string | null = null;
    let photoSize: number | null = null;
    if (input.photo) {
      photoSha256 = crypto
        .createHash("sha256")
        .update(input.photo.buffer)
        .digest("hex");
      photoSize = input.photo.buffer.length;
    }

    const stageId = `STG-${crypto.randomUUID()}`;

    // Create stage record
    const stage = await taskRepository.createStage({
      id: stageId,
      taskId,
      type: input.type,
      lat: input.lat,
      lng: input.lng,
      accuracyM: input.accuracy,
      distanceM,
      verification: "verified",
      deviceTime: deviceDate,
      serverTime: serverDate,
      timeFlagged,
      photoSha256,
      photoSize,
      idempotencyKey: input.idempotencyKey,
    });

    // Store photo in stage_photos table with 7 days expiration
    // if (input.photo) {
    //   const expiresAt = new Date(serverDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    //   await taskRepository.createStagePhoto({
    //     id: `PH-${crypto.randomUUID()}`,
    //     stageId,
    //     data: input.photo.buffer,
    //     mime: input.photo.mime,
    //     expiresAt,
    //   });
    // }
    if (input.photo) {
      const days = task.isImportant
        ? config.importantPhotoRetentionDays
        : config.photoRetentionDays;
      const expiresAt = new Date(
        serverDate.getTime() + days * 24 * 60 * 60 * 1000,
      );
      await taskRepository.createStagePhoto({
        id: `PH-${crypto.randomUUID()}`,
        stageId,
        data: input.photo.buffer,
        mime: input.photo.mime,
        expiresAt,
      });
    }

    // Update task lifecycle status
    const newStatus = input.type === "check_in" ? "checked_in" : "verified";
    const patch: Partial<TaskRecord> = {
      status: newStatus,
      ...(input.type === "check_in"
        ? { reachedAt: serverDate }
        : { verifiedAt: serverDate }),
    };
    await taskRepository.update(taskId, patch);

    // Audit log
    await taskRepository.createHistory({
      id: `HST-${crypto.randomUUID()}`,
      taskId,
      kind: input.type === "check_in" ? "check_in" : "check_out",
      by: employeeId,
      note: `${input.type === "check_in" ? "Check-In" : "Check-Out"} completed (${Math.round(distanceM)} m from site).`,
      after: stage,
    });

    return { status: "accepted", stage, distance: distanceM };
  },

  // 7. Admin Override
  async override(
    taskId: string,
    stageType: "check_in" | "check_out",
    reasonInput: string,
    adminId: string,
  ): Promise<TaskStageRecord> {
    const reason = reasonInput.trim();
    if (reason.length < 10) {
      throw new ServiceError(
        "Override reason must be at least 10 characters.",
        400,
      );
    }

    const task = await taskRepository.findById(taskId);
    if (!task) throw new ServiceError("Visit record not found.", 404);

    if (stageType === "check_in") {
      const existingIn = await taskRepository.findStage(taskId, "check_in");
      if (existingIn)
        throw new ServiceError("This visit is already checked in.", 400);
    }

    if (stageType === "check_out") {
      const existingIn = await taskRepository.findStage(taskId, "check_in");
      if (!existingIn)
        throw new ServiceError(
          "Check-in must be completed (or overridden) first.",
          400,
        );

      const existingOut = await taskRepository.findStage(taskId, "check_out");
      if (existingOut)
        throw new ServiceError("This visit is already checked out.", 400);
    }

    const now = new Date();
    const stageId = `STG-OVR-${crypto.randomUUID()}`;
    const idempotencyKey = `OVR-${taskId}-${stageType}`;

    const stage = await taskRepository.createStage({
      id: stageId,
      taskId,
      type: stageType,
      verification: "override",
      deviceTime: now,
      serverTime: now,
      idempotencyKey,
      overrideBy: adminId,
      overrideReason: reason,
      overrideAt: now,
    });

    const newStatus = stageType === "check_in" ? "checked_in" : "verified";
    await taskRepository.update(taskId, {
      status: newStatus,
      ...(stageType === "check_out" ? { verifiedAt: now } : {}),
    });

    await taskRepository.createHistory({
      id: `HST-${crypto.randomUUID()}`,
      taskId,
      kind: "override",
      by: adminId,
      note: `Admin override applied for ${stageType === "check_in" ? "Check-In" : "Check-Out"}. Reason: ${reason}`,
      after: stage,
    });

    return stage;
  },
  // 8. Admin marks / unmarks a visit as important (30-day photo retention)
  async setImportant(
    taskId: string,
    important: boolean,
    adminId: string,
  ): Promise<TaskRecord> {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new ServiceError("Visit record not found.", 404);
    if (task.isImportant === important) return task;

    const updated = await taskRepository.update(taskId, {
      isImportant: important,
    });
    await photoRepository.setExpiryForTask(
      taskId,
      important
        ? config.importantPhotoRetentionDays
        : config.photoRetentionDays,
    );

    await taskRepository.createHistory({
      id: `HST-${crypto.randomUUID()}`,
      taskId,
      kind: "amended",
      by: adminId,
      note: important
        ? `Marked important by Admin. Photos kept ${config.importantPhotoRetentionDays} days.`
        : `Unmarked important by Admin. Photos kept ${config.photoRetentionDays} days.`,
    });
    return updated!;
  },
};
