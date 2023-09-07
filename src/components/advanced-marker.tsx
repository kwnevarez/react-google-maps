/* eslint-disable complexity */
import React, {
  Children,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useState
} from 'react';

import {createPortal} from 'react-dom';
import {GoogleMapsContext} from './map';

import type {Ref, PropsWithChildren} from 'react';
import {useMapsLibrary} from '../hooks/api-loading-status';

export interface AdvancedMarkerContextValue {
  marker: google.maps.marker.AdvancedMarkerElement;
}

export const AdvancedMarkerContext =
  React.createContext<AdvancedMarkerContextValue | null>(null);

type AdvancedMarkerEventProps = {
  onClick?: (e: google.maps.MapMouseEvent) => void;
  onDrag?: (e: google.maps.MapMouseEvent) => void;
  onDragStart?: (e: google.maps.MapMouseEvent) => void;
  onDragEnd?: (e: google.maps.MapMouseEvent) => void;
};

export type AdvancedMarkerProps = PropsWithChildren<
  google.maps.marker.AdvancedMarkerElementOptions &
    AdvancedMarkerEventProps & {
      /**
       * className to add a class to the advanced marker element
       * Can only be used with HTML Marker content
       */
      className?: string;
    }
>;

export type AdvancedMarkerRef = google.maps.marker.AdvancedMarkerElement | null;
function useAdvancedMarker(props: AdvancedMarkerProps) {
  const [marker, setMarker] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [contentContainer, setContentContainer] =
    useState<HTMLDivElement | null>(null);

  const map = useContext(GoogleMapsContext)?.map;
  const markersLibraryReady = useMapsLibrary('marker');

  const {
    children,
    className,
    onClick,
    onDrag,
    onDragStart,
    onDragEnd,
    collisionBehavior,
    gmpDraggable,
    position,
    title,
    zIndex
  } = props;

  const numChilds = Children.count(children);

  // create marker instance and add it to the map when map becomes available
  useEffect(() => {
    if (!map || !markersLibraryReady) return;

    const marker = new google.maps.marker.AdvancedMarkerElement();
    marker.map = map;

    setMarker(marker);

    // create container for marker content if there are children
    if (numChilds > 0) {
      const el = document.createElement('div');
      if (className) el.classList.add(className);

      marker.content = el;

      setContentContainer(el);
    }

    return () => {
      if (marker) marker.map = null;

      setMarker(null);
      setContentContainer(null);
    };
  }, [map, markersLibraryReady, numChilds]);

  // bind all marker events
  useEffect(() => {
    if (!marker) return;

    const m = marker;

    if (onClick) marker.addListener('click', onClick);
    if (onDrag) marker.addListener('drag', onDrag);
    if (onDragStart) marker.addListener('dragstart', onDragStart);
    if (onDragEnd) marker.addListener('dragend', onDragEnd);

    if ((onDrag || onDragStart || onDragEnd) && !gmpDraggable) {
      console.warn(
        'You need to set the marker to draggable to listen to drag-events.'
      );
    }

    return () => {
      google.maps.event.clearInstanceListeners(m);
    };
  }, [marker, gmpDraggable, onClick, onDragStart, onDrag, onDragEnd]);

  // update other marker props when changed
  useEffect(() => {
    if (!marker) return;

    if (position !== undefined) marker.position = position;
    if (gmpDraggable !== undefined) marker.gmpDraggable = gmpDraggable;
    if (collisionBehavior !== undefined)
      marker.collisionBehavior = collisionBehavior;
    if (zIndex !== undefined) marker.zIndex = zIndex;
    if (typeof title === 'string') marker.title = title;
  }, [marker, position, gmpDraggable, collisionBehavior, zIndex, title]);

  return [marker, contentContainer] as const;
}

export const AdvancedMarker = forwardRef(
  (props: AdvancedMarkerProps, ref: Ref<AdvancedMarkerRef>) => {
    const {children} = props;
    const [marker, contentContainer] = useAdvancedMarker(props);

    useImperativeHandle(ref, () => marker, [marker]);

    if (!marker) {
      return null;
    }

    return (
      <AdvancedMarkerContext.Provider value={{marker}}>
        {contentContainer !== null && createPortal(children, contentContainer)}
      </AdvancedMarkerContext.Provider>
    );
  }
);

export function useAdvancedMarkerRef() {
  const [marker, setMarker] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);

  const refCallback = useCallback((m: AdvancedMarkerRef | null) => {
    setMarker(m);
  }, []);

  return [refCallback, marker] as const;
}