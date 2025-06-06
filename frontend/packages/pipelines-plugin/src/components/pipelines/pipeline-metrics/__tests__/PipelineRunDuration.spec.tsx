import * as React from 'react';
import { parsePrometheusDuration } from '@openshift-console/plugin-shared/src/datetime/prometheus';
import { shallow } from 'enzyme';
import { DEFAULT_PROMETHEUS_TIMESPAN } from '@console/internal/components/graphs';
import { GraphEmpty } from '@console/internal/components/graphs/graph-empty';
import { LoadingInline } from '@console/internal/components/utils';
import MeasureBounds from '@console/pipelines-plugin/src/utils/measure';
import { PipelineExampleNames, pipelineTestData } from '../../../../test-data/pipeline-data';
import { DEFAULT_REFRESH_INTERVAL, PipelineMetricsLevel } from '../../const';
import * as hookUtils from '../../hooks';
import { LineChart } from '../charts/lineChart';
import { MetricsQueryPrefix } from '../pipeline-metrics-utils';
import PipelineRunDurationGraph from '../PipelineRunDurationGraph';

jest.mock('@console/internal/components/utils/k8s-get-hook', () => ({
  useK8sGet: jest.fn(),
}));

const usePipelineRunDurationPollSpy = jest.spyOn(hookUtils, 'usePipelineRunDurationPoll');

const mockData = pipelineTestData[PipelineExampleNames.WORKSPACE_PIPELINE];
const { pipeline } = mockData;

type PipelineRunDurationGraphProps = React.ComponentProps<typeof PipelineRunDurationGraph>;

describe('Pipeline Run Duration Graph', () => {
  let PipelineRunDurationGraphProps: PipelineRunDurationGraphProps;
  beforeEach(() => {
    PipelineRunDurationGraphProps = {
      pipeline,
      timespan: DEFAULT_PROMETHEUS_TIMESPAN,
      interval: parsePrometheusDuration(DEFAULT_REFRESH_INTERVAL),
      queryPrefix: MetricsQueryPrefix.TEKTON_PIPELINES_CONTROLLER,
      metricsLevel: PipelineMetricsLevel.PIPELINE_TASK_LEVEL,
    };
  });

  it('Should render an LoadingInline if query result is loading', () => {
    usePipelineRunDurationPollSpy.mockReturnValue([
      { data: { result: [{ x: 'x' }] } },
      false,
      true,
    ]);
    const PipelineRunDurationGraphWrapper = shallow(
      <PipelineRunDurationGraph {...PipelineRunDurationGraphProps} />,
    );
    expect(PipelineRunDurationGraphWrapper.find(LoadingInline).exists()).toBe(true);
  });

  it('Should render an empty state if query result is empty', () => {
    usePipelineRunDurationPollSpy.mockReturnValue([{ data: { result: [] } }, false, false]);
    const PipelineRunDurationGraphWrapper = shallow(
      <PipelineRunDurationGraph {...PipelineRunDurationGraphProps} />,
    );
    expect(PipelineRunDurationGraphWrapper.find(GraphEmpty).exists()).toBe(true);
  });

  it('Should render an empty state if query resulted in error', () => {
    usePipelineRunDurationPollSpy.mockReturnValue([{ data: { result: [] } }, true, false]);
    const PipelineRunDurationGraphWrapper = shallow(
      <PipelineRunDurationGraph {...PipelineRunDurationGraphProps} />,
    );
    expect(PipelineRunDurationGraphWrapper.find(GraphEmpty).exists()).toBe(true);
  });

  it('Should render a LineChart if data is available', () => {
    usePipelineRunDurationPollSpy.mockReturnValue([
      { data: { result: [{ x: Date.now(), y: 1 }] } },
      false,
      false,
    ]);
    const PipelineRunDurationGraphWrapper = shallow(
      <PipelineRunDurationGraph {...PipelineRunDurationGraphProps} />,
    );
    expect(PipelineRunDurationGraphWrapper.find(LoadingInline).exists()).toBe(false);
    expect(PipelineRunDurationGraphWrapper.find(GraphEmpty).exists()).toBe(false);
    expect(
      PipelineRunDurationGraphWrapper.find(MeasureBounds).dive().find(LineChart).exists(),
    ).toBe(true);
  });
});
