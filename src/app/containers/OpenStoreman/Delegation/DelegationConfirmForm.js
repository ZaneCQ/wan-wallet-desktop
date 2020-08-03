import intl from 'react-intl-universal';
import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import { Button, Modal, Row, Col } from 'antd';
import { formatNum, formatLongText } from 'utils/support';

import 'components/Staking/ValidatorConfirmForm/index.less';

const LEFT = 8;
const RIGHT = 16;

@inject(stores => ({
  settings: stores.session.settings,
}))

@observer
class DelegationConfirmForm extends Component {
  render () {
    const { onCancel, record, onSend, title, showConfirmItem, confirmLoading } = this.props;
    const { delegationFee, crosschain, groupId, account, amount, storeman } = showConfirmItem;

    return (
      <div className="withdraw">
        <Modal visible destroyOnClose={true} closable={false} title={title} onCancel={onCancel} className="withdraw-modal"
          footer={[
            <Button key="back" className="cancel" onClick={onCancel}>{intl.get('Common.cancel')}</Button>,
            <Button loading={!!confirmLoading} key="submit" type="primary" onClick={onSend}>{intl.get('Common.send')}</Button>,
          ]}
        >
          <div className="withdraw-bg">
            <div className="withdraw-title">Storeman Account</div>
            {
              crosschain &&
              <div className="withdraw-line key-style">
                <Row type="flex" justify="space-around" align="middle">
                  <Col span={LEFT}><span className="withdraw-name">Cross Chain</span></Col>
                  <Col span={RIGHT}><span className="withdraw-addr">{record.crosschain}</span></Col>
                </Row>
              </div>
            }
            {
              storeman &&
              <div className="withdraw-line key-style">
                <Row type="flex" justify="space-around" align="middle">
                  <Col span={LEFT}><span className="withdraw-name">Storeman</span></Col>
                  <Col span={RIGHT}><span className="withdraw-addr">{record.storeman}</span></Col>
                </Row>
              </div>
            }
            {
              groupId &&
              <div className="withdraw-line key-style">
                <Row type="flex" justify="space-around" align="middle">
                  <Col span={LEFT}><span className="withdraw-name">Group ID</span></Col>
                  <Col span={RIGHT}><span className="withdraw-addr">{record.groupId}</span></Col>
                </Row>
              </div>
            }
            {
              delegationFee &&
              <div className="withdraw-line key-style">
                <Row type="flex" justify="space-around" align="middle">
                  <Col span={LEFT}><span className="withdraw-name">Delegation Fee</span></Col>
                  <Col span={RIGHT}><span className="withdraw-addr">{record.delegationFee}</span></Col>
                </Row>
              </div>
            }
          </div>
          <div className="withdraw-bg">
            <div className="withdraw-title">{intl.get('ValidatorRegister.myAccount')}</div>
            {
              account &&
              <div className="withdraw-line">
                <Row type="flex" justify="space-around" align="middle">
                  <Col span={LEFT}><span className="withdraw-name">{intl.get('ValidatorRegister.address')}</span></Col>
                  <Col span={RIGHT}><span className="withdraw-addr">{record.account}</span></Col>
                </Row>
              </div>
            }
            {
              amount &&
              <div className="withdraw-line">
                <Row type="flex" justify="space-around" align="middle">
                  <Col span={LEFT}><span className="withdraw-name">{intl.get('Common.amount')}</span></Col>
                  <Col span={RIGHT}><span className="withdraw-addr">{formatNum(record.amount)} WAN</span></Col>
                </Row>
              </div>
            }
          </div>
        </Modal>
      </div>
    );
  }
}

export default DelegationConfirmForm;
