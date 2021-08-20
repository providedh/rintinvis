import * as d3 from 'd3';
import { all, desc, op, table } from 'arquero';

import { group, quantile, quantileSorted } from "d3-array";
import d3Tip from 'd3-tip';

import { io } from "socket.io-client"

import {MDCTextField} from '@material/textfield';
import {MDCRipple} from '@material/ripple';

import '../css/style.scss';
import '../css/header.scss';
import { selectAll } from 'd3';

console.log(window.innerWidth)
console.log(window.innerHeight)
window.d3 = d3
const PADDING = 30;
const socket = io("http://localhost:5000");

let localScansions = [] 

socket.on('connect', () => {
	console.log('Connected to socket');
	socket.emit(' ', {data: 'I\'m connected!'});

})

document.getElementById('start-button').addEventListener("click", (e) => {
	socket.emit('get_scansions', {data: 'fake_data'});		
})

	
const el   = document.getElementById("vis-svg");
const rect = el.getBoundingClientRect();

const visPadding = 6

const visWidth = rect.width - visPadding * 2,
	  visHeight = rect.height - visPadding * 2;

const theSVG = d3.select("#vis-svg");

theSVG.append("rect")
	    .attr("fill", "none")
	    .attr("pointer-events", "all")
	    .attr("width", visWidth)
	    .attr("height", visHeight)
	    .attr("transform", `translate(${visPadding}, ${visPadding})`);


const distantReadGroup = theSVG.append('g')
									.attr('id', 'distant-reading-group');
									

const hBookScale = d3.scaleBand().range([0, visWidth]);
// const horizontalStructScale = d3.scaleBand().range([0, visWidth]);
const vBookScale = d3.scaleBand().range([0, visHeight]);
const radiusScale = d3.scaleLinear().range([9,16]);

const structureColorScale = d3.scaleOrdinal(d3.schemeCategory10);
const unknownStructureColor = 'grey';

const bookLinesScales = [];
let localBooksData = []

let detectedStructs = [];

const bookArcGens = {};

let booksOrder = []

function initVis(booksData) {
	localBooksData = booksData;
	console.log(localBooksData);
	hBookScale.domain([0, 1, 2, 3, 4]);
	// horizontalStructScale.domain(groups.map(g => g.structure_name));
	vBookScale.domain([false, true]);
	booksOrder = localBooksData.map(d => d.book);
	console.log(booksOrder);

	radiusScale.domain(d3.extent(localBooksData, d => d.size));

	//Initialize scales for each book lineplot
	localBooksData.forEach(d => {
		bookLinesScales[d.book] = {
			'xScale': d3.scaleBand().range([5, hBookScale.bandwidth() - 5]),
			'yScale': d3.scaleBand().range([5, vBookScale.bandwidth() - 15])
		}
	});

	const groupWidth = hBookScale.bandwidth();
	const booksGroupEnter = distantReadGroup.selectAll('g')
		.data(localBooksData)
		.enter().append('g')
			.attr('id', (d, i) => `book-group-${i}`)
			.attr('transform', (d, i) => `translate(${hBookScale(i % 5)}, ${vBookScale(i > 4)})`);
	
	booksGroupEnter.append('rect')
			.attr('width', groupWidth)
			.attr('height', vBookScale.bandwidth())
			.attr('fill', 'white')
			.attr('stroke', 'black');
	
	booksGroupEnter.append('text')
			.text(d => d.book)
			.attr('class', 'book-title')
			.attr('x', groupWidth/2)
			.attr('y', vBookScale.bandwidth() - 18)
			.attr('text-anchor', 'middle')
			.attr('alignment-baseline', 'hanging');
	
	booksGroupEnter.append("circle")
			.attr("cx", 20)
			.attr("cy", d => vBookScale.bandwidth() - 18)
			.attr("r", d => radiusScale(d.size))
			.attr("fill", "lightgrey")
			.attr('stroke', 'grey')
			.attr('stroke-width', '2px');
	
	for (const bookEntry of booksData) {
		bookArcGens[bookEntry.book] = d3.arc()
									.innerRadius(0)
									.outerRadius(radiusScale(bookEntry.size))
									.startAngle(0)
									.endAngle(0);
	}

	booksGroupEnter.append('path')
			.attr('id', (d, i) => `progress-arc-${i}`)
			.attr('fill', 'steelblue')
			.attr('stroke', 'blue')
			// .attr('stroke-width', '2px')
			.attr('transform', `translate(20, ${vBookScale.bandwidth() - 18})`);
			// .attr('d', (d, i) => bookArcGens[d.book]());
	
}

function updateVisWithScansions(localScansions) {
	// console.log(localScansions);
	const groupedScansions = d3.group(localScansions, d => d.book);
	// console.log(groupedScansions)
	
	const groups = Array.from(groupedScansions, ([key, value]) => {
		return {'book' : key,
				'poem_scansions': value};
	}).sort((a, b) => a.book > b.book ? 1 : -1);

	console.log(groups);

	for (const [i, group] of groups.entries()) {
		const allLenghts = group.poem_scansions.reduce((acc, val) => {
			return acc.concat(val.lengths);
		}, []);
	
		const maxNumberOfVerses = group.poem_scansions.reduce((acc, val) => {
			return acc >= val['n_verses'] ? acc : val['n_verses'];
		}, 0);
		
		// console.log(group.book, i);
		// console.log(d3.range(d3.max(allLenghts)));
		// console.log(maxNumberOfVerses);
		
		bookLinesScales[group.book]['xScale'].domain(d3.range(d3.max(allLenghts) + 1));
		bookLinesScales[group.book]['yScale'].domain(d3.range(maxNumberOfVerses));

		const bookIndex = booksOrder.indexOf(group.book);
	
		const line = d3.line()
					.x(d => bookLinesScales[group.book]['xScale'](d))
					.y((d, i) => bookLinesScales[group.book]['yScale'](i));
		
		const bookGroup = distantReadGroup.select(`#book-group-${bookIndex}`);
		
		bookGroup.selectAll('.length-line')
				.data(group.poem_scansions, d => d.poem_index)
				.join(
					enter => enter.append("path").attr('class', 'length-line')
				).attr("d", d => {
					return line(d.lengths);
				})
				.attr('stroke', d => {
					return d.poem_structure == 'unknown' ? unknownStructureColor : structureColorScale(detectedStructs.indexOf(d.poem_structure));
				})
				.attr('stroke-width', d => d.poem_structure == 'unknown' ? 0.4 : 1)
				.attr('fill', 'none');
		
		bookGroup.select(`#progress-arc-${bookIndex}`)
				.attr('d', bookArcGens[group.book].endAngle(
						2 * Math.PI * group['poem_scansions'].length / localBooksData.filter(c => c.book == group.book)[0].size
					)()
				)
	}
}

d3.json('http://localhost:5000/get_collection_books/').then((data) => initVis(data));

socket.on('scansion_update', (scansionsData) => {
	console.log(`I received an update (${scansionsData.length} poems)`, scansionsData);
	localScansions = localScansions.concat(scansionsData);

	document.getElementById("bottom-msg").innerHTML = `${localScansions.length} poems processed`;
	detectedStructs = [...new Set([...detectedStructs,...scansionsData.map(d => d.poem_structure)])];
	console.log(detectedStructs);
	updateVisWithScansions(localScansions);
})
// d3.json('http://localhost:5000/get_scansion/').then((data) => console.log(data));

// d3.json('http://localhost:5000/get_doc_clusters/10/1/50/0.01').then(updateVis);
