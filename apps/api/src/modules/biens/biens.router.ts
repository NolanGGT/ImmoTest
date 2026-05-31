import { Router } from 'express'
import * as biensController from './biens.controller'
import * as partageController from '../partage/partage.controller'
import { optionalAuthMiddleware, authMiddleware } from '../../middlewares/auth.middleware'
import { analyserRateLimit, scrapingRateLimit } from '../../middlewares/rateLimit.middleware'
import { validateId } from '../../middlewares/validateId.middleware'

export const biensRouter = Router()

biensRouter.post('/analyser', optionalAuthMiddleware, analyserRateLimit, biensController.analyser)
biensRouter.post('/scrape', optionalAuthMiddleware, scrapingRateLimit, biensController.scrape)
biensRouter.get('/comparer', authMiddleware, biensController.comparer)
biensRouter.get('/price-changes', authMiddleware, biensController.getPriceChanges)
biensRouter.post('/price-changes/seen', authMiddleware, biensController.markPriceChangesSeen)
biensRouter.get('/', authMiddleware, biensController.listBiens)
biensRouter.get('/:id', authMiddleware, validateId, biensController.getBien)
biensRouter.patch('/:id', authMiddleware, validateId, biensController.patchBien)
biensRouter.delete('/:id', authMiddleware, validateId, biensController.deleteBien)
biensRouter.post('/:id/relancer', authMiddleware, validateId, biensController.relancerAnalyse)
biensRouter.post('/:id/partager', authMiddleware, validateId, partageController.creerPartage)
biensRouter.get('/:id/partage', authMiddleware, validateId, partageController.getActiveShare)
biensRouter.delete('/:id/partage', authMiddleware, validateId, partageController.revoquerPartage)
