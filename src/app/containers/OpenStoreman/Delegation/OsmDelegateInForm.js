import intl from 'react-intl-universal';
import React, { Component } from 'react';
import { BigNumber } from 'bignumber.js';
import { observer, inject } from 'mobx-react';
import { Button, Modal, Form, Icon, Select, message, Row, Col, Spin, Avatar } from 'antd';

import localStyle from './index.less'; // Do not delete this line
import PwdForm from 'componentUtils/PwdForm';
import { fromWei, wandWrapper } from 'utils/support.js';
import { signTransaction } from 'componentUtils/trezor';
import { MAIN, TESTNET, WALLETID } from 'utils/settings';
import CommonFormItem from 'componentUtils/CommonFormItem';
import AddrSelectForm from 'componentUtils/AddrSelectForm';
import DelegationConfirmForm from './DelegationConfirmForm';
import style from 'components/Staking/DelegateInForm/index.less';
import { checkAmountUnit, getValueByAddrInfo } from 'utils/helper';

const colSpan = 6;
const ACTION = 'delegateIn';
const pu = require('promisefy-util');
const Confirm = Form.create({ name: 'DelegationConfirmForm' })(DelegationConfirmForm);

@inject(stores => ({
  chainId: stores.session.chainId,
  settings: stores.session.settings,
  addrInfo: stores.wanAddress.addrInfo,
  storemanConf: stores.openstoreman.storemanConf,
  groupChainInfo: stores.openstoreman.groupChainInfo,
  addrSelectedList: stores.wanAddress.addrSelectedList,
  storemanGroupList: stores.openstoreman.storemanGroupList,
  storemanMemberList: stores.openstoreman.storemanMemberList,
  updateTransHistory: () => stores.wanAddress.updateTransHistory(),
  getStoremanMemberList: () => stores.openstoreman.getStoremanMemberList()
}))

@observer
class OsmDelegateInForm extends Component {
  constructor (props) {
    super(props)
    this.state = {
      fee: '0',
      gasPrice: '0',
      gasLimit: '0',
      loading: false,
      record: undefined,
      minAmount: '0',
      confirmVisible: false,
      confirmLoading: false,
      storemanInfo: undefined,
      selectedChain: undefined,
    }
  }

  componentDidMount () {
    this.props.getStoremanMemberList();
  }

  getValueByAddrInfoArgs = (...args) => {
    return getValueByAddrInfo(...args, this.props.addrInfo);
  }

  onChangeAddrSelect = value => {
    this.props.form.setFieldsValue({
      balance: value ? this.getValueByAddrInfoArgs(value, 'balance') : 0
    })
  }

  onStoremanChange = value => {
    let { form, storemanMemberList, storemanGroupList, storemanConf } = this.props;
    if (value) {
      let storeman = value.split('/')[0];
      let storemanInfo = storemanMemberList.find(i => i.wkAddr === storeman);
      let groupInfo = storemanGroupList.find(i => i.groupId === storemanInfo.groupId);
      let crosschain = storemanInfo ? `${storemanInfo.chain1[2]} <-> ${storemanInfo.chain2[2]}` : undefined;
      form.setFieldsValue({
        storeman,
        crosschain,
        quota: storemanInfo ? new BigNumber(fromWei(storemanInfo.deposit)).multipliedBy(storemanConf.delegationMulti).minus(fromWei(storemanInfo.delegateDeposit)).toString(10) : '0',
        delegationFee: groupInfo ? groupInfo.delegateFee / 100 + '%' : '0%',
      });
      this.setState({ storemanInfo, minAmount: fromWei(groupInfo.minDelegateIn) });
    } else {
      form.setFieldsValue({
        storeman: null,
        quota: '0',
        delegationFee: '0',
      });
      this.setState({ storemanInfo: undefined, minAmount: '0' });
    }
  }

  onCrossChainChange = crosschain => {
    this.props.form.setFieldsValue({ crosschain });
    this.setState({ crosschain });
  }

  checkAmount = (rule, value, callback) => {
    let { form } = this.props;
    let { quota, balance } = form.getFieldsValue(['quota', 'balance']);

    if (value === '0' || value === undefined || !checkAmountUnit(18, value)) {
      callback(intl.get('Common.invalidAmount'));
    }
    if (new BigNumber(value).gte(balance)) {
      callback(intl.get('NormalTransForm.overBalance'));
      return;
    }
    if (new BigNumber(value).lt(this.state.minAmount)) {
      callback(intl.get('Common.amountTooLow', { minAmount: this.state.minAmount }));
      return;
    }
    if (new BigNumber(value).gt(quota)) {
      callback(intl.get('StakeInForm.stakeExceed'));
      return;
    }

    let { myAddr: from } = form.getFieldsValue(['myAddr']);
    if (from && this.state.storemanInfo) {
      let BIP44Path = this.getValueByAddrInfoArgs(from, 'path');
      let walletID = from.indexOf(':') !== -1 ? WALLETID[from.split(':')[0].toUpperCase()] : WALLETID.NATIVE;
      let tx = {
        walletID,
        BIP44Path,
        amount: value,
        wkAddr: this.state.storemanInfo.wkAddr,
        from: from.indexOf(':') === -1 ? from : from.split(':')[1].trim(),
      }
      wand.request('storeman_openStoremanAction', { tx, action: ACTION, isEstimateFee: false }, (err, ret) => {
        if (err || !ret.code) {
          message.warn(intl.get('ValidatorRegister.updateFailed'));
        } else {
          let data = ret.result;
          this.setState({
            gasPrice: data.gasPrice,
            gasLimit: data.estimateGas,
            fee: fromWei(new BigNumber(data.gasPrice).multipliedBy(data.estimateGas).toString(10))
          })
        }
      });
    }

    callback();
  }

  showConfirmForm = () => {
    this.setState({ loading: true })
    let { form, settings } = this.props;
    form.validateFields(async (err) => {
      if (err) {
        this.setState({ loading: false });
        return;
      };
      if (new BigNumber(form.getFieldValue('balance')).minus(form.getFieldValue('amount')).lt(this.state.fee)) {
        this.setState({ loading: false });
        message.warn(intl.get('NormalTransForm.overBalance'));
        return;
      }

      let { myAddr: account, amount, pwd, delegationFee, crosschain, storeman } = form.getFieldsValue(['myAddr', 'amount', 'pwd', 'delegationFee', 'crosschain', 'storeman']);
      if (settings.reinput_pwd) {
        if (!pwd) {
          message.warn(intl.get('Backup.invalidPassword'));
          this.setState({ loading: false });
          return;
        }

        try {
          await pu.promisefy(wand.request, ['phrase_checkPwd', { pwd: pwd }], this);
        } catch (error) {
          message.warn(intl.get('Backup.invalidPassword'));
          this.setState({ loading: false });
          return;
        }
      }

      this.setState({
        loading: false,
        confirmVisible: true,
        record: { amount, account, wkAddr: storeman.split('/')[0], crosschain, delegationFee, }
      });
    })
  }

  onConfirmCancel = () => {
    this.setState({ confirmVisible: false, confirmLoading: false });
  }

  onSend = async () => {
    this.setState({ confirmLoading: true });
    let { form } = this.props;
    let { myAddr: from, amount } = form.getFieldsValue(['myAddr', 'amount']);
    let BIP44Path = this.getValueByAddrInfoArgs(from, 'path');
    let walletID = from.indexOf(':') !== -1 ? WALLETID[from.split(':')[0].toUpperCase()] : WALLETID.NATIVE;

    from = from.indexOf(':') === -1 ? from : from.split(':')[1].trim();
    let tx = {
      from,
      walletID,
      BIP44Path,
      amount: amount.toString(),
      gasLimit: this.state.gasLimit,
      wkAddr: this.state.storemanInfo.wkAddr,
    }
    if (walletID === WALLETID.LEDGER) {
      message.info(intl.get('Ledger.signTransactionInLedger'))
    }
    if (walletID === WALLETID.TREZOR) {
      let satellite = { wkAddr: this.state.storemanInfo.wkAddr, annotate: 'Storeman-delegateIn' };
      try {
        await this.trezorTrans(BIP44Path, from, amount, satellite);
      } catch (err) {
        message.warn(intl.get('WanAccount.sendTransactionFailed'));
        console.log(`trezorTrans Error: ${err}`)
      }
      message.warn(intl.get('WanAccount.sendTransactionSuccessFully'));
      this.setState({ confirmVisible: false });
      this.props.onSend(walletID);
    } else {
      wand.request('storeman_openStoremanAction', { tx, action: ACTION }, (err, ret) => {
        if (err) {
          message.warn(intl.get('WanAccount.sendTransactionFailed'));
        } else {
          console.log('validatorModify ret:', ret);
          message.warn(intl.get('WanAccount.sendTransactionSuccessFully'));
        }
        this.props.updateTransHistory();
        this.setState({ confirmVisible: false, confirmLoading: false });
        this.props.onSend();
      });
    }
  }

  onClick = () => {
    let href = this.props.chainId === 1 ? `${MAIN}/storemangroups` : `${TESTNET}/storemangroups`;
    wand.shell.openExternal(href);
  }

  trezorTrans = async (BIP44Path, from, amount, satellite) => {
    try {
      let tx = {
        amount,
        BIP44Path,
        walletID: WALLETID.TREZOR,
        wkAddr: this.state.storemanInfo.wkAddr,
        from: from.indexOf(':') === -1 ? from : from.split(':')[1].trim(),
      }
      let { result: estimateData } = await wandWrapper('storeman_openStoremanAction', { tx, action: ACTION, isEstimateFee: false });
      let rawTx = {
        from,
        chainId: Number(estimateData.chainId),
        Txtype: 1,
        to: estimateData.to,
        value: estimateData.value,
        data: estimateData.data,
        nonce: '0x' + estimateData.nonce.toString(16),
        gasPrice: '0x' + Number(estimateData.gasPrice).toString(16),
        gasLimit: '0x' + Number(estimateData.gasLimit).toString(16),
      };
      let raw = await pu.promisefy(signTransaction, [BIP44Path, rawTx], this);// Trezor sign
      let txHash = await pu.promisefy(wand.request, ['transaction_raw', { raw, chainType: 'WAN' }], this);
      let params = {
        txHash,
        from: from.toLowerCase(),
        to: rawTx.to,
        value: rawTx.value,
        gasPrice: rawTx.gasPrice,
        gasLimit: rawTx.gasLimit,
        nonce: rawTx.nonce,
        srcSCAddrKey: 'WAN',
        srcChainType: 'WAN',
        tokenSymbol: 'WAN',
        status: 'Sent',
      }
      await pu.promisefy(wand.request, ['storeman_insertStoremanTransToDB', { tx: params, satellite }], this);
      this.props.updateTransHistory();
    } catch (error) {
      console.log('Trezor validator append failed', error);
      message.warn(intl.get('WanAccount.sendTransactionFailed'));
    }
  }

  render () {
    const { storemanMemberList, form, settings, onCancel, addrSelectedList, groupChainInfo } = this.props;
    const { getFieldDecorator } = form;
    let showConfirmItem = { storeman: true, delegationFee: true, crosschain: true, account: true, amount: true };
    let storemanListSelect = storemanMemberList.filter(i => {
      let crosschain = this.state.crosschain;
      return !crosschain || crosschain === `${i.chain1[2]} <-> ${i.chain2[2]}`;
    }).map((v, index) => <div value={`${v.wkAddr}/${v.groupId}/${index}`}><Avatar src={v.icon} value={v.nameShowing} size="small" />{v.nameShowing}</div>);

    let crosschainListSelect = groupChainInfo.filter(i => {
      let storemanInfo = this.state.storemanInfo;
      return !storemanInfo || storemanInfo.crosschain === i;
    });

    let spin = storemanMemberList.length !== 0 && groupChainInfo.length !== 0;
    let isCapacity = Number(form.getFieldValue('quota')) === 0;

    return (
      <div>
        <Modal visible destroyOnClose={true} closable={false} title={intl.get('StakeInForm.title')} onCancel={this.onCancel} className={style['stakein-modal'] + ' spincont'}
          footer={[
            <Button key="back" className="cancel" onClick={onCancel}>{intl.get('Common.cancel')}</Button>,
            <Button disabled={!spin || isCapacity} loading={this.state.loading} key="submit" type="primary" onClick={this.showConfirmForm}>{intl.get('Common.next')}</Button>,
          ]}
        >
          <Spin spinning={!spin} size="large">
            <div className="validator-bg">
              <div className="stakein-title">Storeman's Account</div>
              <div className="validator-line">
                <Row type="flex" justify="space-around" align="middle">
                  <Col span={6}><span className="stakein-name">Cross Chain</span></Col>
                  <Col span={18}>
                    <Form layout="inline" id="osmChainSelect">
                      <Form.Item>
                        {getFieldDecorator('crosschain', {
                          rules: [{ required: false }],
                        })(
                          <Select
                            showSearch
                            allowClear
                            style={{ width: 400 }}
                            placeholder="Select Cross Chain"
                            optionFilterProp="children"
                            onChange={this.onCrossChainChange}
                            getPopupContainer={() => document.getElementById('osmChainSelect')}
                          >
                            {crosschainListSelect.map((item, index) => <Select.Option value={item} key={index}>{item}</Select.Option>)}
                          </Select>
                        )}
                      </Form.Item>
                    </Form>
                  </Col>
                </Row>
              </div>
              <div className="validator-line">
                <Row type="flex" justify="space-around" align="middle" className="storeman">
                  <Col span={6}><span className="stakein-name">Storeman</span></Col>
                  <Col span={15}>
                    <Form layout="inline" id="osmNameSelect">
                      <Form.Item>
                        {getFieldDecorator('storeman', {
                          rules: [{ required: false }],
                        })(
                          <Select
                            showSearch
                            allowClear
                            style={{ width: 400 }}
                            placeholder="Select Storeman Account"
                            optionFilterProp="children"
                            onChange={this.onStoremanChange}
                            getPopupContainer={() => document.getElementById('osmNameSelect')}
                            filterOption={(input, option) => option.props.children.props.children[1].toLowerCase().indexOf(input.toLowerCase()) >= 0}
                          >
                            {storemanListSelect.map((item, index) => <Select.Option value={item.props.value} key={index}>{item}</Select.Option>)}
                          </Select>
                        )}
                      </Form.Item>
                    </Form>
                  </Col>
                  <Col span={3} align="right" className={style['col-stakein-info']}>
                    <a onClick={this.onClick}>{intl.get('StakeInForm.more')}</a>
                  </Col>
                </Row>
              </div>
              <CommonFormItem form={form} formName='quota' disabled={true}
                options={{ initialValue: '0' }}
                prefix={<Icon type="credit-card" className="colorInput" />}
                title='Capacity'
                colSpan={colSpan}
              />
              <CommonFormItem form={form} formName='delegationFee' disabled={true}
                options={{ initialValue: '0' }}
                prefix={<Icon type="credit-card" className="colorInput" />}
                title='Delegation Fee'
                colSpan={colSpan}
              />
            </div>
            <div className="validator-bg">
              <div className="stakein-title">{intl.get('ValidatorRegister.myAccount')}</div>
              <div className="validator-line">
                <AddrSelectForm form={form} colSpan={6} addrSelectedList={addrSelectedList} handleChange={this.onChangeAddrSelect} getValueByAddrInfoArgs={this.getValueByAddrInfoArgs} />
              </div>
              <CommonFormItem form={form} formName='balance' disabled={true}
                options={{ initialValue: '0' }}
                prefix={<Icon type="credit-card" className="colorInput" />}
                title={intl.get('ValidatorRegister.balance')}
                colSpan={colSpan}
              />
              <CommonFormItem form={form} formName='amount'
                options={{ rules: [{ required: true, validator: this.checkAmount }] }}
                prefix={<Icon type="credit-card" className="colorInput" />}
                title={intl.get('Common.amount')}
                placeholder={this.state.minAmount}
                colSpan={colSpan}
              />
              <CommonFormItem form={form} formName='fee' disabled={true}
                options={{ initialValue: this.state.fee + ' WAN' }}
                prefix={<Icon type="credit-card" className="colorInput" />}
                title="Gas Fee"
                colSpan={colSpan}
              />
              {settings.reinput_pwd && <PwdForm form={form} />}
            </div>
          </Spin>
        </Modal>
        {
          this.state.confirmVisible &&
          <Confirm
            onSend={this.onSend}
            record={this.state.record}
            onCancel={this.onConfirmCancel}
            showConfirmItem={showConfirmItem}
            visible={this.state.confirmVisible}
            confirmLoading={this.state.confirmLoading}
            title={intl.get('NormalTransForm.ConfirmForm.transactionConfirm')}
          />
        }
      </div>
    );
  }
}

export default OsmDelegateInForm;