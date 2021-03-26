import intl from 'react-intl-universal';
import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import { Table, Select } from 'antd';

import history from 'static/image/history.png';
import { ETHMAIN, ETHTESTNET } from 'utils/settings';

const Option = Select.Option;

@inject(stores => ({
  isMainNetwork: stores.session.isMainNetwork,
  addrInfo: stores.ethAddress.addrInfo,
  language: stores.languageIntl.language,
  historyList: stores.ethAddress.historyList,
  selectedAddr: stores.ethAddress.selectedAddr,
  transColumns: stores.languageIntl.transColumns,
  setCurrPage: page => stores.ethAddress.setCurrPage(page),
  setSelectedAddr: addr => stores.ethAddress.setSelectedAddr(addr)
}))

@observer
class ETHTransHistory extends Component {
  constructor (props) {
    super(props);
    this.props.setCurrPage(this.props.name || []);
  }

  onChange = value => {
    this.props.setSelectedAddr(value);
  }

  onClickRow = record => {
    let href = this.props.isMainNetwork ? `${ETHMAIN}/tx/${record.key}` : `${ETHTESTNET}/tx/${record.key}`
    wand.shell.openExternal(href);
  }

  render () {
    const { addrInfo, historyList, name } = this.props;
    let addrList = [];

    if (name) {
      name.forEach(val => { addrList = addrList.concat(Object.entries(addrInfo[val]).map(v => ({ address: v[0], name: v[1].name }))) });
    }

    return (
      <div>
        <div className="historyCon" id="ethAddrSelect">
          <img src={history} /><span>{intl.get('TransHistory.transactionHistory')}</span>
          <Select
            showSearch
            allowClear
            style={{ width: 400 }}
            placeholder={intl.get('TransHistory.selectAFromAddress')}
            optionFilterProp="children"
            onChange={this.onChange}
            defaultValue={this.props.selectedAddr ? this.props.selectedAddr[0] : undefined}
            getPopupContainer = {() => document.getElementById('ethAddrSelect')}
            filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
          >
            {addrList.map((item, index) => <Option value={item.address} key={index}>{item.name}</Option>)}
          </Select>
        </div>
        <div className="historyRow">
          <Table onRow={record => ({ onClick: this.onClickRow.bind(this, record) })} columns={this.props.transColumns} dataSource={historyList} pagination={{ pageSize: 5, hideOnSinglePage: true }} />
        </div>
      </div>
    );
  }
}

export default ETHTransHistory;
