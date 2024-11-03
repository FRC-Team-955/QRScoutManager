import { Fragment, render } from 'preact';
import { useState } from 'preact/hooks';
import { signal, Signal } from '@preact/signals';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import { QRCodeSVG } from "qrcode.react"

import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';

const FMS_ROBOTS = [
	"Red 1",
	"Red 2",
	"Red 3",
	"Blue 1",
	"Blue 2",
	"Blue 3",
]

let globalId = 0;
class Person {
	constructor(name) {
		this.name = name;
		/**
		 * @type string
		 */
		this.assignedRobot = null;
		this.matchesScouted = Math.round(Math.random() * 15);

		this.id = globalId;
		globalId++;
	}
}

/**
 * @type Signal<Person[]>
 */
const peopleNotInQueue = signal([
	new Person("Joey"),
	new Person("Tom"),
	new Person("Tim"),
	new Person("John"),
	new Person("Jebediah"),
	new Person("Bob"),
	new Person("Bill"),
	new Person("Valentina"),
]);

/**
 * @type Signal<Person[]>
 */
const peopleInQueue = signal([]);

/**
 * @param {Person} personToAdd
 */
function addToQueue(personToAdd) {
	peopleNotInQueue.value = peopleNotInQueue.value.filter((person) => person.id != personToAdd.id)
	peopleInQueue.value = [...peopleInQueue.value, personToAdd];
	assignRobots()
}

/**
 * @param {Person} personToAdd
 */
function removeFromQueue(personToAdd) {
	peopleInQueue.value = peopleInQueue.value.filter((person) => person.id != personToAdd.id)
	peopleNotInQueue.value = [...peopleNotInQueue.value, personToAdd]
}

const matchStarted = signal(false);

/**
 * @type Signal<Person[]>
 */
const peopleInMatch = signal([]);

const matchNumber = signal(0);

const matchTeamNumbers = [
	signal(NaN),
	signal(NaN),
	signal(NaN),
	signal(NaN),
	signal(NaN),
	signal(NaN),
];

function assignRobots() {
	peopleInQueue.value = peopleInQueue.value.map((value, index) => {
		if (index < 6) {
			value.assignedRobot = FMS_ROBOTS[index];
		}
		return value;
	});
}

function startMatch() {
	peopleInMatch.value = peopleInQueue.value.slice(0, 6);
	peopleInQueue.value = peopleInQueue.value.slice(6);
	matchStarted.value = true;
}

function endMatch() {
	for (let person of peopleInMatch.value) {
		person.matchesScouted++
	}
	peopleNotInQueue.value = [...peopleNotInQueue.value, ...peopleInMatch.value]
	peopleInMatch.value = []
	matchStarted.value = false
}

function Queue() {
	return (
		<div>
			{matchStarted.value ?
				<Fragment>
					<h2>Current match</h2>

					<p>Match number: {matchNumber.value}</p>

					<p>Scouters:</p>
					<ul>
						{peopleInMatch.value.map((person, index) => (
							<li>
								{person.name} - {FMS_ROBOTS[index]}, Team {matchTeamNumbers[index].value}
								{" "}
								<ScouterQRCodeModal index={index} />
							</li>
						))}
					</ul>
				</Fragment> : <></>
			}
			<h2>Queued people</h2>
			<ul>
				{peopleInQueue.value.map(person => (
					<li>
						{person.name}
						<Button
							variant="danger"
							style={{ marginLeft: "8px" }}
							onClick={() => {
								removeFromQueue(person)
							}}
						>Remove from queue</Button>
					</li>
				))}
			</ul>
			<h2>Unqueued People</h2>
			<ul>
				{peopleNotInQueue.value.map(person => (
					<li>
						{person.name}
						<Button
							variant="success"
							style={{ marginLeft: "8px" }}
							onClick={() => {
								addToQueue(person)
							}}
						>Add to queue</Button>
					</li>
				))}
			</ul>
			<MatchManagement />
		</div>
	);
}

function ScouterQRCodeModal({ index }) {
	const qrCodeData = JSON.stringify({
		name: peopleInMatch.value[index].name,
		matchNumber: matchNumber.value,
		teamNumber: matchTeamNumbers[index].value,
		fmsRobot: FMS_ROBOTS[index],
	})

	const [show, setShow] = useState(false);

	return (
		<Fragment>
			<Button variant="primary" onClick={() => setShow(true)}>
				Show QR code
			</Button>

			<Modal show={show} onHide={() => setShow(false)}>
				<Modal.Header closeButton>
					<Modal.Title>QR Code for {peopleInMatch.value[index].name}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<QRCodeSVG value={qrCodeData} size={"max"}></QRCodeSVG>
				</Modal.Body>
			</Modal>
		</Fragment>
	);
}

function MatchManagement() {
	const [showStart, setShowStart] = useState(false);
	const [showEnd, setShowEnd] = useState(false);

	return (
		<div>
			<Button
				variant={matchStarted.value ? "danger" : 'success'}
				onClick={() => {
					if (matchStarted.value) {
						setShowEnd(true);
					} else {
						assignRobots()
						matchNumber.value = NaN
						setShowStart(true)
					}
				}}
			>{matchStarted.value ? "End match" : 'Start match'}</Button>

			<Modal show={showStart}>
				<Modal.Header>
					<Modal.Title>Start match</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<InputGroup>
						<InputGroup.Text id="matchNumber">Match Number:</InputGroup.Text>
						<Form.Control
							placeholder="Please enter match number"
							aria-describedby="matchNumber"
							type='number'
							value={matchNumber.value}
							onChange={event => (matchNumber.value = Number.parseInt(event.currentTarget.value))}
						/>
					</InputGroup>
					<br />

					<p>Team numbers:</p>
					<ul>
						{matchTeamNumbers.map((signal, index) => (
							<li>
								<InputGroup>
									<InputGroup.Text id={"teamNumber" + index}>{FMS_ROBOTS[index]} - Team </InputGroup.Text>
									<Form.Control
										placeholder="Please enter team number"
										aria-describedby={"teamNumber" + index}
										type='number'
										value={signal.value}
										onChange={event => (signal.value = Number.parseInt(event.currentTarget.value))}
									/>
								</InputGroup>
							</li>
						))}
					</ul>

					<p>These people will be included in the match:</p>
					<ul>
						{peopleInQueue.value.slice(0, 6).map(person => (
							<li>
								{person.name}
								<Button
									variant="danger"
									style={{ marginLeft: "8px" }}
									onClick={() => {
										removeFromQueue(person)
									}}
								>Remove from queue</Button>
								{" - "}{person.assignedRobot}
							</li>
						))}
					</ul>

					{
						peopleInQueue.value.length < 6 ?
							<Fragment>
								<p style={{ color: "red" }}>You need at least 6 people queued to start a match. Here are the people you could add to the queue:</p>
								<ul>
									{peopleNotInQueue.value.map(person => (
										<li>
											{person.name}
											<Button
												variant="success"
												style={{ marginLeft: "8px" }}
												onClick={() => {
													addToQueue(person)
												}}
											>Add to queue</Button>
										</li>
									))}
								</ul>
							</Fragment>
							: <></>
					}

					{
						matchTeamNumbers.some(signal => Number.isNaN(signal.value)) ?
							<p style={{ color: "red" }}>Please enter 6 valid team numbers.</p>
							: <></>
					}

					{
						Number.isNaN(matchNumber.value) ?
							<p style={{ color: "red" }}>Please enter a valid match number.</p>
							: <></>
					}
				</Modal.Body>
				<Modal.Footer>
					<Button variant="danger" onClick={() => setShowStart(false)}>
						Cancel
					</Button>
					<Button
						variant="success"
						disabled={peopleInQueue.value.length < 6 || matchTeamNumbers.some(signal => Number.isNaN(signal.value))}
						onClick={() => {
							if (peopleInQueue.value.length < 6 || matchTeamNumbers.some(signal => Number.isNaN(signal.value)))
								return;

							startMatch()
							setShowStart(false);
						}}
					>
						Start
					</Button>
				</Modal.Footer>
			</Modal>

			<Modal show={showEnd}>
				<Modal.Header>
					<Modal.Title>End match</Modal.Title>
				</Modal.Header>
				<Modal.Body>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="danger" onClick={() => setShowEnd(false)}>
						Cancel
					</Button>
					<Button variant="success" onClick={() => {
						endMatch()
						setShowEnd(false);
					}}>
						Done
					</Button>
				</Modal.Footer>
			</Modal>
		</div>
	);
}

function Leaderboard() {
	return (
		<div>
			<h2>Leaderboard</h2>
			<ul>
				{
					[...peopleInQueue.value, ...peopleNotInQueue.value, ...peopleInMatch.value]
						.sort((a, b) => b.matchesScouted - a.matchesScouted)
						.map(person => (
							<li>
								{person.name}: {person.matchesScouted}
							</li>
						))
				}
			</ul>
			<Button variant="primary">
				Send to Discord (TODO)
			</Button>
		</div>
	);
}

function Settings() {
	const [show, setShow] = useState(false);

	function DebugList({ list }) {
		return <ul>{list.map(element => <li><pre>{JSON.stringify(element)}</pre></li>)}</ul>
	}

	return (
		<div>
			<h2>Settings</h2>

			<Button variant="primary" onClick={() => { }}>
				Export data (TODO)
			</Button>

			<br />

			<Button variant="primary" onClick={() => { }}>
				Import data (TODO)
			</Button>

			<br />

			<Button variant="primary" onClick={() => setShow(true)}>
				Debug info
			</Button>

			<Modal show={show} onHide={() => setShow(false)}>
				<Modal.Header closeButton>
					<Modal.Title>Debug info</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<p>Global ID: {globalId}</p>

					<p>Match started: {matchStarted.value ? "yes" : "no"}</p>

					<p>Match number: {matchNumber.value}</p>

					<p>Team numbers:</p>
					<ul>{matchTeamNumbers.map((element, index) => <li><p>{FMS_ROBOTS[index]} - Team {element.value}</p></li>)}</ul>

					<p>People in queue</p>
					<DebugList list={peopleInQueue.value} />

					<p>People not in queue</p>
					<DebugList list={peopleNotInQueue.value} />

					<p>People in match</p>
					<DebugList list={peopleInMatch.value} />
				</Modal.Body>
			</Modal>
		</div>
	);
}


export function App() {
	return (
		<Fragment>
			<h1>QRScoutManager</h1>
			<br />
			<Queue />
			<br />
			<Leaderboard />
			<br />
			<Settings />
		</Fragment>
	);
}

render(<App />, document.getElementById("app"));
