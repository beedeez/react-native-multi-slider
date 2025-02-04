import React from 'react';
import {
	StyleSheet,
	PanResponder,
	View,
	Platform,
	I18nManager
} from 'react-native';
import DefaultMarker from './DefaultMarker';
import { createArray, valueToPosition, positionToValue } from './converters';

export default class MultiSlider extends React.Component {
	static defaultProps = {
		values: [0],
		onValuesChangeStart: () => {},
		onValuesChange: () => {},
		onValuesChangeFinish: () => {},
		onMarkersPosition: () => {},
		step: 1,
		min: 0,
		max: 10,
		touchDimensions: {
			height: 60,
			width: 60,
			borderRadius: 15,
			slipDisplacement: 220
		},
		customMarker: DefaultMarker,
		customMarkerLeft: DefaultMarker,
		customMarkerRight: DefaultMarker,
		markerOffsetX: 0,
		markerOffsetY: 0,
		sliderLength: 280,
		onToggleOne: undefined,
		onToggleTwo: undefined,
		enabledOne: true,
		enabledTwo: true,
		allowOverlap: false,
		snapped: false,
		minMarkerOverlapDistance: 0,
		allowTrackTouch: false,
		enabled: true,
	};

	constructor({ min, max, step, sliderLength, values, optionsArray }) {
		super();

		this.optionsArray = optionsArray || createArray(min, max, step);
		this.stepLength = sliderLength / this.optionsArray.length;

		const initialValues = values.map((value) =>
			valueToPosition(value, this.optionsArray, sliderLength)
		);

		this.state = {
			pressedOne: true,
			valueOne: values[0],
			valueTwo: values[1],
			pastOne: initialValues[0],
			pastTwo: initialValues[1],
			positionOne: initialValues[0],
			positionTwo: initialValues[1]
		};
	}

	componentWillMount() {
		const twoMarkers = this.props.values.length == 2; // when allowOverlap, positionTwo could be 0, identified as string '0' and throwing 'RawText 0 needs to be wrapped in <Text>' error

		var customPanResponder = (start, move, end) => {
			return PanResponder.create({
				onStartShouldSetPanResponder: (evt, gestureState) => true,
				onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
				onMoveShouldSetPanResponder: (evt, gestureState) => true,
				onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
				onPanResponderGrant: (evt, gestureState) => start(),
				onPanResponderMove: (evt, gestureState) => move(gestureState),
				onPanResponderTerminationRequest: (evt, gestureState) => false,
				onPanResponderRelease: (evt, gestureState) => end(gestureState),
				onPanResponderTerminate: (evt, gestureState) => end(gestureState),
				onShouldBlockNativeResponder: (evt, gestureState) => true
			});
		};

		this._panResponderBetween = customPanResponder(
			(gestureState) => {
				this.startOne(gestureState);
				this.startTwo(gestureState);
			},
			(gestureState) => {
				this.moveOne(gestureState);
				this.moveTwo(gestureState);
			},
			(gestureState) => {
				this.endOne(gestureState);
				this.endTwo(gestureState);
			}
		);

		this._panResponderOne = customPanResponder(
			this.startOne,
			this.moveOne,
			this.endOne
		);
		this._panResponderTwo = customPanResponder(
			this.startTwo,
			this.moveTwo,
			this.endTwo
		);

		if (twoMarkers || !this.props.allowTrackTouch) {
			this._panResponderSingleMarkerTrack = {};
		} else {
			this._panResponderSingleMarkerTrack = PanResponder.create({
				onStartShouldSetPanResponder: (event, gestureState) => true,
				onStartShouldSetPanResponderCapture: (event, gestureState) => true,
				onMoveShouldSetPanResponder: (event, gestureState) => false,
				onMoveShouldSetPanResponderCapture: (event, gestureState) => false,
				onPanResponderGrant: (event, gestureState) => false,
				onPanResponderMove: (event, gestureState) => false,
				onPanResponderRelease: ({ nativeEvent }, gestureState) => {
					if (!this.props.enabled) {
						return;
					}

					const { locationX, pageX } = nativeEvent;
					const unconfined =
						pageX > this.state.pageX
							? this.state.positionOne + locationX
							: locationX;

					var bottom = 0;
					var trueTop =
						this.state.positionTwo -
						(this.props.allowOverlap
							? 0
							: this.props.minMarkerOverlapDistance > 0
							? this.props.minMarkerOverlapDistance
							: this.stepLength);
					var top = trueTop === 0 ? 0 : trueTop || this.props.sliderLength;
					var confined =
						unconfined < bottom ? bottom : unconfined > top ? top : unconfined;

					const value = positionToValue(
						confined,
						this.optionsArray,
						this.props.sliderLength
					);

					const snapped = valueToPosition(
						value,
						this.optionsArray,
						this.props.sliderLength
					);

					if (value !== this.state.valueOne) {
						this.setState(
							{
								positionOne: snapped,
								valueOne: value
							},
							() => {
								const change = [this.state.valueOne];

								if (this.state.valueTwo) {
									change.push(this.state.valueTwo);
								}

								this.props.onValuesChange(change);

								this.props.onMarkersPosition([
									this.state.positionOne,
									this.state.positionTwo
								]);

								this.setState(
									{
										pastOne: this.state.positionOne,
										pageX
									},
									() => {
										this.props.onValuesChangeFinish(change);
									}
								);
							}
						);
					}
				}
			});
		}
	}

	componentWillReceiveProps(nextProps) {
		if (this.state.onePressed || this.state.twoPressed) {
			return;
		}

		let nextState = {};
		if (
			nextProps.min !== this.props.min ||
			nextProps.max !== this.props.max ||
			nextProps.step !== this.props.step ||
			nextProps.values[0] !== this.state.valueOne ||
			nextProps.sliderLength !== this.props.sliderLength ||
			nextProps.values[1] !== this.state.valueTwo ||
			(nextProps.sliderLength !== this.props.sliderLength &&
				nextProps.values[1])
		) {
			this.optionsArray =
				this.props.optionsArray ||
				createArray(nextProps.min, nextProps.max, nextProps.step);

			this.stepLength = this.props.sliderLength / this.optionsArray.length;

			var positionOne = valueToPosition(
				nextProps.values[0],
				this.optionsArray,
				nextProps.sliderLength
			);
			nextState.valueOne = nextProps.values[0];
			nextState.pastOne = positionOne;
			nextState.positionOne = positionOne;

			var positionTwo = valueToPosition(
				nextProps.values[1],
				this.optionsArray,
				nextProps.sliderLength
			);
			nextState.valueTwo = nextProps.values[1];
			nextState.pastTwo = positionTwo;
			nextState.positionTwo = positionTwo;
		}

		if (nextState != {}) {
			this.setState(nextState);

			if (
				typeof nextState.positionOne !== 'undefined' &&
				typeof nextState.positionTwo !== 'undefined'
			) {
				this.props.onMarkersPosition([
					nextState.positionOne,
					nextState.positionTwo
				]);
			}
		}
	}

	startOne = () => {
		if (this.props.enabledOne && this.props.enabled) {
			this.props.onValuesChangeStart();
			this.setState({
				onePressed: !this.state.onePressed
			});
		}
	};

	startTwo = () => {
		if (this.props.enabledTwo && this.props.enabled) {
			this.props.onValuesChangeStart();
			this.setState({
				twoPressed: !this.state.twoPressed
			});
		}
	};

	moveOne = (gestureState) => {
		if (!this.props.enabledOne || !this.props.enabled) {
			return;
		}

		const accumDistance = gestureState.dx;
		const accumDistanceDisplacement = gestureState.dy;
		const unconfined = I18nManager.isRTL
			? this.state.pastOne - accumDistance
			: accumDistance + this.state.pastOne;
		var bottom = 0;
		var trueTop =
			this.state.positionTwo -
			(this.props.allowOverlap
				? 0
				: this.props.minMarkerOverlapDistance > 0
				? this.props.minMarkerOverlapDistance
				: this.stepLength);
		var top = trueTop === 0 ? 0 : trueTop || this.props.sliderLength;
		var confined =
			unconfined < bottom ? bottom : unconfined > top ? top : unconfined;
		var slipDisplacement = this.props.touchDimensions.slipDisplacement;

		if (
			Math.abs(accumDistanceDisplacement) < slipDisplacement ||
			!slipDisplacement
		) {
			var value = positionToValue(
				confined,
				this.optionsArray,
				this.props.sliderLength
			);
			var snapped = valueToPosition(
				value,
				this.optionsArray,
				this.props.sliderLength
			);
			this.setState({
				positionOne: this.props.snapped ? snapped : confined
			});

			if (value !== this.state.valueOne) {
				this.setState(
					{
						valueOne: value
					},
					() => {
						var change = [this.state.valueOne];
						if (this.state.valueTwo) {
							change.push(this.state.valueTwo);
						}
						this.props.onValuesChange(change);

						this.props.onMarkersPosition([
							this.state.positionOne,
							this.state.positionTwo
						]);
					}
				);
			}
		}
	};

	moveTwo = (gestureState) => {
		if (!this.props.enabledTwo || !this.props.enabled) {
			return;
		}

		const accumDistance = gestureState.dx;
		const accumDistanceDisplacement = gestureState.dy;
		const unconfined = I18nManager.isRTL
			? this.state.pastTwo - accumDistance
			: accumDistance + this.state.pastTwo;
		var bottom =
			this.state.positionOne +
			(this.props.allowOverlap
				? 0
				: this.props.minMarkerOverlapDistance > 0
				? this.props.minMarkerOverlapDistance
				: this.stepLength);
		var top = this.props.sliderLength;
		var confined =
			unconfined < bottom ? bottom : unconfined > top ? top : unconfined;
		var slipDisplacement = this.props.touchDimensions.slipDisplacement;

		if (
			Math.abs(accumDistanceDisplacement) < slipDisplacement ||
			!slipDisplacement
		) {
			var value = positionToValue(
				confined,
				this.optionsArray,
				this.props.sliderLength
			);
			var snapped = valueToPosition(
				value,
				this.optionsArray,
				this.props.sliderLength
			);

			this.setState({
				positionTwo: this.props.snapped ? snapped : confined
			});

			if (value !== this.state.valueTwo) {
				this.setState(
					{
						valueTwo: value
					},
					() => {
						this.props.onValuesChange([
							this.state.valueOne,
							this.state.valueTwo
						]);

						this.props.onMarkersPosition([
							this.state.positionOne,
							this.state.positionTwo
						]);
					}
				);
			}
		}
	};

	endOne = (gestureState) => {
		if (gestureState.moveX === 0 && this.props.onToggleOne) {
			this.props.onToggleOne();
			return;
		}

		this.setState(
			{
				pastOne: this.state.positionOne,
				onePressed: !this.state.onePressed
			},
			() => {
				var change = [this.state.valueOne];
				if (this.state.valueTwo) {
					change.push(this.state.valueTwo);
				}
				this.props.onValuesChangeFinish(change);
			}
		);
	};

	endTwo = (gestureState) => {
		if (gestureState.moveX === 0 && this.props.onToggleTwo) {
			this.props.onToggleTwo();
			return;
		}

		this.setState(
			{
				twoPressed: !this.state.twoPressed,
				pastTwo: this.state.positionTwo
			},
			() => {
				this.props.onValuesChangeFinish([
					this.state.valueOne,
					this.state.valueTwo
				]);
			}
		);
	};

	setMarkerOneRef = (ref) => {
		if (ref) {
			this._markerOne = ref;
		}
	};

	setMarkerTwoRef = (ref) => {
		if (ref) {
			this._markerTwo = ref;
		}
	};

	_markerOne = null;
	_markerTwo = null;

	render() {
		const {
			selectedStyle,
			unselectedStyle,
			sliderLength,
			markerOffsetX,
			markerOffsetY
		} = this.props;

		const { positionOne, positionTwo } = this.state;
		const twoMarkers = this.props.values.length == 2; // when allowOverlap, positionTwo could be 0, identified as string '0' and throwing 'RawText 0 needs to be wrapped in <Text>' error
		const trackOneLength = positionOne;
		const trackOneStyle = twoMarkers
			? unselectedStyle
			: selectedStyle || styles.selectedTrack;
		const trackThreeLength = twoMarkers ? sliderLength - positionTwo : 0;
		const trackThreeStyle = unselectedStyle;
		const trackTwoLength = sliderLength - trackOneLength - trackThreeLength;
		const trackTwoStyle = twoMarkers
			? selectedStyle || styles.selectedTrack
			: unselectedStyle;
		const Marker = this.props.customMarker;
		const MarkerLeft = this.props.customMarkerLeft;
		const MarkerRight = this.props.customMarkerRight;
		const isMarkersSeparated = this.props.isMarkersSeparated || false;
		const isMarkerOneEnabled = this.props.enabledOne && this.props.enabled;
		const isMarkerTwoEnabled = this.props.enabledTwo && this.props.enabled;

		const { borderRadius } = this.props.touchDimensions;

		const touchStyle = {
			borderRadius: borderRadius || 0
		};

		const markerContainerOne = {
			top: markerOffsetY - 24,
			left: trackOneLength + markerOffsetX - 24
		};

		const markerContainerTwo = {
			top: markerOffsetY - 24,
			right: trackThreeLength - markerOffsetX - 24
		};

		const containerStyle = [styles.container, this.props.containerStyle];


		return (
			<View style={containerStyle}>
				<View
					style={[styles.fullTrack, { width: sliderLength }]}
					{...this._panResponderSingleMarkerTrack.panHandlers}>
					<View
						style={[
							styles.track,
							this.props.trackStyle,
							trackOneStyle,
							{ width: trackOneLength }
						]}
					/>

					<View
						style={[
							styles.track,
							this.props.trackStyle,
							trackTwoStyle,
							{ width: trackTwoLength }
						]}
						{...(twoMarkers ? this._panResponderBetween.panHandlers : {})}
					/>

					{twoMarkers && (
						<View
							style={[
								styles.track,
								this.props.trackStyle,
								trackThreeStyle,
								{ width: trackThreeLength }
							]}
						/>
					)}

					<View
						style={[
							styles.markerContainer,
							markerContainerOne,
							this.props.markerContainerStyle,
							positionOne > sliderLength / 2 && styles.topMarkerContainer
						]}>
						<View
							style={[styles.touch, touchStyle]}
							ref={this.setMarkerOneRef}
							{...this._panResponderOne.panHandlers}>
							{isMarkersSeparated === false ? (
								<Marker
									enabled={isMarkerOneEnabled}
									pressed={this.state.onePressed}
									markerStyle={this.props.markerStyle}
									pressedMarkerStyle={this.props.pressedMarkerStyle}
									disabledMarkerStyle={this.props.disabledMarkerStyle}
									currentValue={this.state.valueOne}
									valuePrefix={this.props.valuePrefix}
									valueSuffix={this.props.valueSuffix}
								/>
							) : (
								<MarkerLeft
									enabled={isMarkerOneEnabled}
									pressed={this.state.onePressed}
									markerStyle={this.props.markerStyle}
									pressedMarkerStyle={this.props.pressedMarkerStyle}
									disabledMarkerStyle={this.props.disabledMarkerStyle}
									currentValue={this.state.valueOne}
									valuePrefix={this.props.valuePrefix}
									valueSuffix={this.props.valueSuffix}
								/>
							)}
						</View>
					</View>

					{twoMarkers && positionOne !== this.props.sliderLength && (
						<View
							style={[
								styles.markerContainer,
								markerContainerTwo,
								this.props.markerContainerStyle
							]}>
							<View
								style={[styles.touch, touchStyle]}
								ref={this.setMarkerTwoRef}
								{...this._panResponderTwo.panHandlers}>
								{isMarkersSeparated === false ? (
									<Marker
										enabled={isMarkerTwoEnabled}
										pressed={this.state.twoPressed}
										markerStyle={this.props.markerStyle}
										pressedMarkerStyle={this.props.pressedMarkerStyle}
										disabledMarkerStyle={this.props.disabledMarkerStyle}
										currentValue={this.state.valueTwo}
										valuePrefix={this.props.valuePrefix}
										valueSuffix={this.props.valueSuffix}
									/>
								) : (
									<MarkerRight
										enabled={isMarkerTwoEnabled}
										pressed={this.state.twoPressed}
										markerStyle={this.props.markerStyle}
										pressedMarkerStyle={this.props.pressedMarkerStyle}
										disabledMarkerStyle={this.props.disabledMarkerStyle}
										currentValue={this.state.valueTwo}
										valuePrefix={this.props.valuePrefix}
										valueSuffix={this.props.valueSuffix}
									/>
								)}
							</View>
						</View>
					)}
				</View>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		position: 'relative',
		height: 50,
		justifyContent: 'center'
	},
	fullTrack: {
		flexDirection: 'row'
	},
	track: {
		...Platform.select({
			ios: {
				height: 2,
				borderRadius: 2,
				backgroundColor: '#A7A7A7'
			},
			android: {
				height: 2,
				backgroundColor: '#CECECE'
			},
			web: {
				height: 2,
				borderRadius: 2,
				backgroundColor: '#A7A7A7'
			}
		})
	},
	selectedTrack: {
		...Platform.select({
			ios: {
				backgroundColor: '#095FFF'
			},
			android: {
				backgroundColor: '#0D8675'
			},
			web: {
				backgroundColor: '#095FFF'
			}
		})
	},
	markerContainer: {
		position: 'absolute',
		width: 48,
		height: 48,
		backgroundColor: 'transparent',
		justifyContent: 'center',
		alignItems: 'center'
	},
	topMarkerContainer: {
		zIndex: 1
	},
	touch: {
		backgroundColor: 'transparent',
		justifyContent: 'center',
		alignItems: 'center',
		alignSelf: 'stretch'
	}
});
