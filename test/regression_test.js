const { assert } = require('chai');

describe('regression functions', async()=> {
	describe('top level functions', async()=> {
		it('default regression should be ridge and it should have default properties', async() =>{
			const regression_set = await page.evaluate(async() => {
				return await webgazer.getRegression()
			})
			const regression_name = await page.evaluate(async() => {
				return await webgazer.getRegression()[0].name
			})
			assert.equal(regression_name,"ridge")
			assert.isNotNull(regression_set[0].dataClicks)
			assert.isNotNull(regression_set[0].dataTrail)
			assert.isNotNull(regression_set[0].eyeFeaturesClicks)
			assert.isNotNull(regression_set[0].eyeFeaturesTrail)
			assert.isNotNull(regression_set[0].kalman)
			assert.isNotNull(regression_set[0].ridgeParameter)
			assert.isNotNull(regression_set[0].screenXClicksArray)
			assert.isNotNull(regression_set[0].screenYClicksArray)
			assert.isNotNull(regression_set[0].screenXTrailArray)
			assert.isNotNull(regression_set[0].screenYTrailArray)
			assert.isNotNull(regression_set[0].trailDataWindow)
			assert.isNotNull(regression_set[0].trailTime)
			assert.isNotNull(regression_set[0].trailTimes)
		})

		it('mouse clicks and moves should be stored in regs', async()=>{
			await page.mouse.click(500,600)
			let regsClicksArray = await page.evaluate(async()=>{
				//these indices will change if other tests produce clicks
				return {x:await webgazer.getRegression()[0].screenXClicksArray.data[1][0],
						y:await webgazer.getRegression()[0].screenYClicksArray.data[1][0]}
			})
			assert.equal(regsClicksArray.x,500)
			assert.equal(regsClicksArray.y,600)

			await page.mouse.move(50, 60);
			let regsTrailArray = await page.evaluate(async()=>{
				return {x:await webgazer.getRegression()[0].screenXTrailArray.data[0],
						y:await webgazer.getRegression()[0].screenYTrailArray.data[0]}
			})
			assert.equal(regsTrailArray.x[0],50)
			assert.equal(regsTrailArray.y[0],60)
		})
		it('should be able to store points', async()=>{
			const points = await page.evaluate(async()=>{
				await webgazer.storePoints(100, 200, 0)
				return await webgazer.getStoredPoints() 
			})
			assert.equal(points[0][0],100)
			assert.equal(points[1][0],200)
		})
		it('should return regression data', async()=> {
			await page.evaluate(async() => {
				document.getElementsByClassName('Calibration')[0].click()
				
			})
			let regs = await page.evaluate(async()=>{
				return await webgazer.getRegression()
			})
			assert.isNotNull(regs)
		})
		it('should make predictions', async()=>{
			const prediction = await page.evaluate(async() => {
				return await webgazer.getCurrentPrediction()
			})			
			assert.isNotNull(prediction)
		})

		it('should be able to add a new regression', async()=>{
			const new_regression = await page.evaluate(async() => {
				webgazer.addRegression("weightedRidge")
				return await webgazer.getRegression()[1]
			})
			assert.isNotNull(new_regression)
			assert.isNotNull(new_regression.dataClicks)
			assert.isNotNull(new_regression.dataTrail)
			assert.isNotNull(new_regression.eyeFeaturesClicks)
			assert.isNotNull(new_regression.eyeFeaturesTrail)
			assert.isNotNull(new_regression.kalman)
			assert.isNotNull(new_regression.ridgeParameter)
			assert.isNotNull(new_regression.screenXClicksArray)
			assert.isNotNull(new_regression.screenYClicksArray)
			assert.isNotNull(new_regression.screenXTrailArray)
			assert.isNotNull(new_regression.screenYTrailArray)
			assert.isNotNull(new_regression.trailDataWindow)
			assert.isNotNull(new_regression.trailTime)
			assert.isNotNull(new_regression.trailTimes)	
		})
	})
	describe("regression ridge predictions", async()=>{
		it('should return null when prediction is called with no eyesObjects', async()=>{
			const no_eyes_prediction = await page.evaluate(async() => {
				return await webgazer.getRegression()[0].predict()
			})
			assert.isNull(no_eyes_prediction)
		})
		it('should return a prediction when eyesObject is valid', async()=>{
			const eyes_prediction = await page.evaluate(async() => {
				const videoElementCanvas = document.getElementById('webgazerVideoCanvas')
				const eyeFeatures = await webgazer.getTracker().getEyePatches(videoElementCanvas,videoElementCanvas.width,videoElementCanvas.height)
				return await webgazer.getRegression()[0].predict(eyeFeatures)
			})
			assert.isNotNull(eyes_prediction)
		})
		it('Kalman filter should exist and have properties', async()=>{
			const kalman_applied = await page.evaluate(async() => {
				return webgazer.applyKalmanFilter()
			})
			assert.isNotNull(kalman_applied)
			const kalman_filter = await page.evaluate(async() => {
				return webgazer.getRegression()[0].kalman
			})
			assert.isNotNull(kalman_filter.F)
			assert.isNotNull(kalman_filter.H)
			assert.isNotNull(kalman_filter.P)
			assert.isNotNull(kalman_filter.Q)
			assert.isNotNull(kalman_filter.R)
			assert.isNotNull(kalman_filter.X)
		})
		it('Kalman filter should be updateable', async()=>{
			const kalman_filter_upgdate = await page.evaluate(async() => {
				return webgazer.getRegression()[0].kalman.update([500,500])
			})
			assert.isNotNull(kalman_filter_upgdate)

		})
	})
	describe("regression ridgeWeighted predictions", async()=>{
		it('should return null when prediction is called with no eyesObjects', async()=>{
			const no_eyes_prediction = await page.evaluate(async() => {
				return await webgazer.getRegression()[1].predict()
			})
			assert.isNull(no_eyes_prediction)
		})
		it('should return a prediction when eyesObject is valid', async()=>{
			const eyes_prediction = await page.evaluate(async() => {
				const videoElementCanvas = document.getElementById('webgazerVideoCanvas')
				const eyeFeatures = await webgazer.getTracker().getEyePatches(videoElementCanvas,videoElementCanvas.width,videoElementCanvas.height)
				return await webgazer.getRegression()[1].predict(eyeFeatures)
			})
			assert.isNotNull(eyes_prediction)
		})
		it('Kalman filter should exist and have properties', async()=>{
			const kalman_applied = await page.evaluate(async() => {
				return webgazer.applyKalmanFilter()
			})
			assert.isNotNull(kalman_applied)
			const kalman_filter = await page.evaluate(async() => {
				return webgazer.getRegression()[1].kalman
			})
			assert.isNotNull(kalman_filter.F)
			assert.isNotNull(kalman_filter.H)
			assert.isNotNull(kalman_filter.P)
			assert.isNotNull(kalman_filter.Q)
			assert.isNotNull(kalman_filter.R)
			assert.isNotNull(kalman_filter.X)
		})
		it('Kalman filter should be updateable', async()=>{
			const kalman_filter_upgdate = await page.evaluate(async() => {
				return webgazer.getRegression()[1].kalman.update([500,500])
			})
			assert.isNotNull(kalman_filter_upgdate)
		})
		it('should be able to grayscale an image', async() =>{
			const grayscale = await page.evaluate(async() => {
				const videoElementCanvas = document.getElementById('webgazerVideoCanvas')
				const eyeFeatures = await webgazer.getTracker().getEyePatches(videoElementCanvas,videoElementCanvas.width,videoElementCanvas.height)
				return await webgazer.util.grayscale(eyeFeatures.left)
			})
			assert.isNotNull(grayscale)
		
			it('should be able to equalize a grayscaled image', async() =>{
				const equalizeHistogram = await page.evaluate(async() => {
					await webgazer.util.equalizeHistogram(grayscale,5,[])
				})
				assert.isNotNull(equalizeHistogram)
			})
		})
	})					
})
