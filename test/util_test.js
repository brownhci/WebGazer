const { assert } = require('chai');

describe('top level util functions', async()=> {
	it('should be able to get eyefeats', async()=>{
		const eyefeats = await page.evaluate(async() =>{
			const videoElementCanvas = document.getElementById('webgazerVideoCanvas')
			return await webgazer.getTracker().getEyePatches(videoElementCanvas,videoElementCanvas.width,videoElementCanvas.height)
		})
		assert.isNotNull(eyefeats)
	})
	it('should be able to resize an eye', async() => {
		const resized_eye = await page.evaluate(async() => {
			const videoElementCanvas = document.getElementById('webgazerVideoCanvas')
			const eyeFeatures = await webgazer.getTracker().getEyePatches(videoElementCanvas,videoElementCanvas.width,videoElementCanvas.height)
			
			return Array.from(await webgazer.util.resizeEye(eyeFeatures.left,6,10).data);
		})
		assert.isNotNull(resized_eye)
	})
	it('should be able to grayscale an image', async() =>{
		const grayscale  =  await page.evaluate(async() => {
			const videoElementCanvas = document.getElementById('webgazerVideoCanvas')
			const eyeFeatures = await webgazer.getTracker().getEyePatches(videoElementCanvas,videoElementCanvas.width,videoElementCanvas.height)
			const resized_left = await webgazer.util.resizeEye(eyeFeatures.left,6,10)
			return Array.from(await webgazer.util.grayscale(resized_left.data,eyeFeatures.width,eyeFeatures.height))
		})
		assert.isNotNull(grayscale)
		
	})
	it('should be able to equalize a grayscaled image', async() =>{
		const equalizeHistogram  =  await page.evaluate(async() => {
			const videoElementCanvas = document.getElementById('webgazerVideoCanvas')
			const eyeFeatures = await webgazer.getTracker().getEyePatches(videoElementCanvas,videoElementCanvas.width,videoElementCanvas.height)
			const resized_left = await webgazer.util.resizeEye(eyeFeatures.left,6,10)
			const grayscale = await webgazer.util.grayscale(resized_left.data,eyeFeatures.width,eyeFeatures.height)
			return await webgazer.util.equalizeHistogram(grayscale,5,[])
		})
		assert.isNotNull(equalizeHistogram)
	})
	it('bound should adjust values to be within the appropriate range', async() =>{
		const width = await page.evaluate(async() => {
			return Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
		})
		const height = await page.evaluate(async() => {
			return Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
		})
		const lower_bound = await page.evaluate(async() => {
			return await webgazer.util.bound({x:-100,y:-100})
		})
		assert.equal(lower_bound.x,0)
		assert.equal(lower_bound.y,0)
		const upper_bound = await page.evaluate(async(width,height) => {
			return await webgazer.util.bound({x:width+10,y:height+10})
		}, width,height)
		assert.equal(upper_bound.x,width)
		assert.equal(upper_bound.y,height)
	})
	//TO-DO?  DataWindow testing
	
})
