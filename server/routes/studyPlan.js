const express = require('express')
const router  = express.Router()
const { verifyToken } = require('../middleware/verifyToken')
const {
  createPlan, updateDay, getActive, getHistory, replan,
} = require('../controllers/studyPlanController')

// AI-generating actions live under /api/ai/study-plan/* (consistent with /api/ai)
router.post('/ai/study-plan/create',            verifyToken, createPlan)
router.post('/ai/study-plan/:planId/replan',    verifyToken, replan)

// Tracking / read actions live under /api/study-plan/*
router.get('/study-plan/active',                verifyToken, getActive)
router.get('/study-plan/history',               verifyToken, getHistory)
router.patch('/study-plan/:planId/days/:dayId', verifyToken, updateDay)

module.exports = router
