import React from 'react';
import { analytics } from './analytics';

export interface CardIdProps {
  templateId?: string;
  systemCardId?: string;
  instanceId?: string;
  experimentId?: string;
  slotId?: string;
}

export function withCardId<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  defaultTemplateId?: string,
  defaultSystemCardId?: string
) {
  const WithCardIdComponent = React.forwardRef<any, P & CardIdProps>((props, ref) => {
    const {
      templateId = defaultTemplateId,
      systemCardId = defaultSystemCardId,
      instanceId,
      experimentId,
      slotId,
      ...wrappedProps
    } = props;

    // Generate unique instance ID if not provided
    const finalInstanceId = instanceId || React.useMemo(() => 
      `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, []
    );

    // Track impression on mount
    const impressionId = React.useRef<string>();
    React.useEffect(() => {
      if (templateId) {
        impressionId.current = analytics.trackImpression(
          templateId,
          'v1',
          systemCardId,
          experimentId,
          slotId
        );
      }
    }, [templateId, systemCardId, experimentId, slotId]);

    const dataAttributes: Record<string, string> = {};
    
    if (templateId) {
      dataAttributes['data-template-id'] = templateId;
    }
    
    if (systemCardId) {
      dataAttributes['data-system-card-id'] = systemCardId;
    }
    
    if (finalInstanceId) {
      dataAttributes['data-card-instance-id'] = finalInstanceId;
    }
    
    if (experimentId) {
      dataAttributes['data-experiment-id'] = experimentId;
    }

    // Create analytics-enhanced props
    const enhancedProps = React.useMemo(() => {
      const props = wrappedProps as any;
      
      // Wrap onClick handlers to track clicks
      const wrapClickHandler = (originalHandler?: Function, action?: string) => {
        return (...args: any[]) => {
          if (templateId) {
            analytics.trackClick(
              templateId,
              'v1',
              action || 'click',
              systemCardId,
              experimentId
            );
          }
          if (originalHandler) {
            originalHandler(...args);
          }
        };
      };

      // Enhanced props with analytics
      const enhanced = { ...props };
      
      if (props.onClick) {
        enhanced.onClick = wrapClickHandler(props.onClick, 'primary_click');
      }
      
      if (props.onButtonClick) {
        enhanced.onButtonClick = wrapClickHandler(props.onButtonClick, 'cta_execute');
      }
      
      if (props.onSecondaryButtonClick) {
        enhanced.onSecondaryButtonClick = wrapClickHandler(props.onSecondaryButtonClick, 'secondary_click');
      }

      return enhanced;
    }, [wrappedProps, templateId, systemCardId, experimentId]);

    return (
      <div {...dataAttributes} style={{ display: 'contents' }}>
        <WrappedComponent {...(enhancedProps as P)} ref={ref} />
      </div>
    );
  });

  WithCardIdComponent.displayName = `withCardId(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithCardIdComponent;
}

export default withCardId;