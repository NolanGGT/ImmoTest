import { Router } from 'express'
import * as partageController from './partage.controller'

export const partageRouter = Router()

partageRouter.get('/:token', partageController.getByToken)
