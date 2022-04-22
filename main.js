pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`

let sides = {}
let foundSides = false
let lastSide = 'left'

function dragOverHandler(ev) {
  console.log('File(s) in drop zone');
	document.querySelector('body p.icons').innerText = '📂'
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
}

async function dropHandler(ev) {
  console.log('File(s) dropped');
	sides = {}
	foundSides = false
	lastSide = 'left'
	document.querySelector('body p.icons').innerText = '...'
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();

  if (ev.dataTransfer.items) {
    for (let i = 0; i < ev.dataTransfer.items.length; i++) {
      if (ev.dataTransfer.items[i].kind === 'file') {
        let file = ev.dataTransfer.items[i].getAsFile();
				let content = await file.text()
				console.log(content)
				const objectURL = window.URL.createObjectURL(file);
				let loadingTask = pdfjsLib.getDocument(objectURL)
				let pdf = await loadingTask.promise
				let page = await pdf.getPage(1)
				const textContent = await page.getTextContent();
				parseTextContent(textContent.items)
      }
    }
  } else {
    for (let i = 0; i < ev.dataTransfer.files.length; i++) {
      console.log('... file[' + i + '].name = ' + ev.dataTransfer.files[i].name);
    }
  }
}

function parseTextContent(textContent) {
	console.log(textContent)
	let splitLines = [{str:''}]
	let lines = ['']
	for (let i=0; i<textContent.length; i++) {
		let text = textContent[i]
		if (text.str.trim() == "" && !text.hasEOL) continue
		let currLine = lines[lines.length-1]
		let currSplitLine = splitLines[splitLines.length-1]
		if (!foundSides) {
			if (text.str == "שמאל") {
					console.log("found left")
					sides.left = text.transform[4]
			} else if (textContent[i].str == "ימין") {
					console.log("found right")
					sides.right = text.transform[4]
			}
			if (sides.left && sides.right) {
				foundSides = true
				sides.center = sides.right + (sides.left - sides.right)/2	
			}
		}
		if (foundSides) {
			let currSide = text.transform[4]>sides.center?'left':'right';
			if (!currSplitLine.side) currSplitLine.side = currSide
			if (!currSplitLine.height) currSplitLine.height = text.transform[5]
			if (currSide != lastSide) {
					splitLines.push({str:'', side: currSide})
					lastSide = currSide
			}
		}
		splitLines[splitLines.length-1].str += text.str + " "
		lines[lines.length-1] = lines[lines.length-1] + text.str + " "
		if (text.hasEOL) {
				lines.push('')
				splitLines.push({str:''})
		}
		
	}
	console.log({lines, splitLines})
	let recs, leftBirads, rightBirads
	let leftLines = []
	let rightLines = []
	for (let i=0; i<lines.length; i++) {
		if (lines[i].includes("המלצות")) {
			console.log(lines[i])
			recs = lines[i].replace("המלצות", "")
			recs = recs.replace(":", "")
			recs = recs.replace("  ", " ").trim()
			break
		}
	}
	for (let i=0; i<splitLines.length; i++) {
		if (splitLines[i].str.trim() == "") continue
		if (splitLines[i].str.trim() == "שמאל" || splitLines[i].str.trim() == "ימין" ) continue
		if (splitLines[i].str.includes("סונר")) {
			sides.top = splitLines[i].height
		}
		else if (splitLines[i].str.includes("BIRADS"))	{
			console.log(splitLines[i])
			sides.bottom = splitLines[i].height
			let num = splitLines[i].str.match(/\d/g)[0]
			if (splitLines[i].side == "left") leftBirads = num
			if (splitLines[i].side == "right") rightBirads = num
		}
		else if (splitLines[i].side == "left") leftLines.push(splitLines[i])
		else if (splitLines[i].side == "right") rightLines.push(splitLines[i])
	}
	leftLines.sort((a, b) => b.height-a.height)
	leftLines = leftLines.filter(line => line.height>sides.bottom&&line.height<sides.top)
	rightLines.sort((a, b) => b.height-a.height)
	rightLines = rightLines.filter(line => line.height>sides.bottom&&line.height<sides.top)
	renderResults({recs, leftBirads, rightBirads, leftLines, rightLines})
}

function renderResults(results) {
	console.log(results)
	let mainElm = document.createElement('main')
	let rightElm = document.createElement('div')
	let leftElm = document.createElement('div')
	let rightHeaderElm = document.createElement('h2')
	rightHeaderElm.innerText = "ימין"
	let leftHeaderElm = document.createElement('h2')
	leftHeaderElm.innerText = "שמאל"
	let rightListElm = document.createElement('ul')
	let leftListElm = document.createElement('ul')
	for (let i=0; i<results.rightLines.length; i++) {
		let line = results.rightLines[i]
		let itemElm = document.createElement('li')
		itemElm.innerText = line.str //line.height + " - " + line.str
		rightListElm.append(itemElm)
	}
	for (let i=0; i<results.leftLines.length; i++) {
		let line = results.leftLines[i]
		let itemElm = document.createElement('li')
		itemElm.innerText = line.str //line.height + " - " + line.str
		leftListElm.append(itemElm)
	}
	let rightBiradsElm = document.createElement('p')
	rightBiradsElm.innerText = "BIRADS: " + results.rightBirads
	let leftBiradsElm = document.createElement('p')
	leftBiradsElm.innerText = "BIRADS: " + results.leftBirads
	rightElm.append(rightHeaderElm)
	rightElm.append(rightListElm)
	rightElm.append(rightBiradsElm)
	leftElm.append(leftHeaderElm)
	leftElm.append(leftListElm)
	leftElm.append(leftBiradsElm)
	let sidesElm = document.createElement('div')
	sidesElm.classList.add("sides")
	sidesElm.append(leftElm)
	sidesElm.append(rightElm)
	mainElm.append(sidesElm)
	if (results.recs) {
		let recsElm = document.createElement('h2')
		recsElm.innerText = "המלצות: " + results.recs
		mainElm.append(recsElm)
	}
	document.body.innerHTML = ''
	document.body.append(mainElm)
	// document.querySelector('body p').innerText = str 
}
