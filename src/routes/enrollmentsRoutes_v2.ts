import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { success } from "zod";

//import middleware
import { authenticateToken } from "../middlewares/authenMiddleware.js";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminMiddleware.js";
import { checkRoleStudent } from "../middlewares/checkRoleStudentMiddleware.js";
import { checkRoles } from "../middlewares/checkRolesMiddleware.js";


dotenv.config();

import type { User, CustomRequest, Enrollment } from "../libs/types.js";
import { zEnrollmentBody } from "../libs/zodValidators.js";

// import database
import { enrollments, reset_enrollments ,students} from "../db/db.js";
import { en } from "zod/locales";

const router = Router();


// GET /api/v2/enrollments (ADMIN only)
router.get(
  "/",
  authenticateToken, // verify token and extract "user payload"
  checkRoleAdmin, // check User exists and ADMIN role
  (req: CustomRequest, res: Response) => {
    try {
      // return all users
      return res.json({
        success: true,
        message: "Enrollments Information",
        data: enrollments,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);

// POST /api/v2/enrollments/reset
router.post("/reset",authenticateToken,checkRoleAdmin, (req: CustomRequest, res: Response) => {
  try {
    reset_enrollments();
    return res.status(200).json({
      success: true,
      message: "enrollments database has been reset",
    });
  } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
  }
});

// GET /api/v2/enrollments/:studentId
router.get(
  "/:studentId",
  authenticateToken, // verify token and extract "user payload"
  checkRoles, // check User exists
  (req: CustomRequest, res: Response) => {
    try {
      
      let student = students.filter((s) => s.studentId === req.params.studentId); 

      if(req.user?.role === "ADMIN"){
        return res.status(200).json({
        success: true,
        message: "Student Information",
        data: student,
      });
      }

      if(req.user?.role === "STUDENT" && req.user.studentId === req.params.studentId){
        return res.status(200).json({
          success: true,
          message: "Student Information",
          data: student,
        });
      }

      return res.status(403).json({
          success: false,
          message: "Forbidden access"
      });

      
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);

//POST /api/v2/enrollments/:studentId
router.post(
  "/:studentId",
  authenticateToken,
  checkRoleStudent,
  (req: CustomRequest, res: Response) => {
    try {
      const body = req.body;

      // validate req.body with predefined validator
      const result = zEnrollmentBody.safeParse(body); // check zod
      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      if (req.params.studentId !== req.user?.studentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }
      //check duplicate courseId
      const duplicate = enrollments.filter(
        (enr) =>
          enr.studentId === req.params.studentId &&
          enr.courseId === body.courseId
      );
      if (duplicate.length > 0) {
        return res.status(409).json({
          success: false,
          message: "studentId && courseId is already exists",
        });
      }

      const newEnrollment: Enrollment = {
        studentId: req.params.studentId!,
        courseId: body.courseId,
      };
      enrollments.push(newEnrollment);

      return res.status(201).json({
        success: true,
        message: `Student ${req.params.studentId} && ${req.body.courseId} has been added successfully`,
        data: newEnrollment,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Somthing is wrong, please try again",
        error: err,
      });
    }
  }
);

// DELETE /api/v2/enrollments/:studentId
router.delete("/:studentId", authenticateToken, checkRoleStudent, (req: CustomRequest, res: Response) => {
  try {

    if(req.body.studentId !== req.user?.studentId){
      return res.status(403).json({
      success: false,
      message: "You are not allowed to modify another student's data",
    });
    }

    const foundIndex = enrollments.findIndex(
      (e) => e.studentId === req.body.studentId && e.courseId === req.body.courseId
    );

    if (foundIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Enrollment does not exist",
      });
    }

    enrollments.splice(foundIndex, 1);

    return res.status(200).json({
      success: true,
      message: `StudentId ${req.body.studentId} && Course ${req.body.courseId} has been deleted successfully`,
      data: enrollments,
    });
  } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Somthing is wrong, please try again",
        error: err,
      });
    }
});


export default router;